# stack: data (remote state, ephemeral)

External database wiring. Spec: §4.4.
State: HCP Terraform workspace `itassetpulse-data` (organization `gabor-toth-personalprojects`),
Local execution mode. Cleanly initialized against HCP Terraform in #203; the former S3 state was verified
empty beforehand and is a retained historical recovery copy only (retired by #209).

> **This workspace has no state snapshot yet.** `terraform state list` therefore exits `1` with
> `No state file was found!` rather than exiting `0` with no output — the workspace has *never* had a state
> version, which is different from holding an empty one. That is expected and must not be "repaired": no
> artificial empty state was uploaded. The first real `terraform apply` creates the first state version.

## What it creates

- `random_password.mongo_db_user` — a Terraform-generated password for the database user; never a
  hand-written, version-controlled value.
- `mongodbatlas_database_user.app` — a database user on `var.atlas_project_id`, `auth_database_name =
  "admin"` (SCRAM authentication), with a single `readWrite` role scoped to `var.mongodb_database_name`. No
  `scopes` block is set, so **the role applies to every cluster in the project on which that database
  exists** — the user is not restricted to a single cluster. This stack does not introduce a cluster-scope
  feature.
- `aws_secretsmanager_secret.mongo_uri` + `aws_secretsmanager_secret_version.mongo_uri` — holds the full
  `MONGO_URI` connection string the backend reads via `process.env.MONGO_URI`
  (`backend/src/app.module.ts`). `name_prefix` (not a fixed `name`) and `recovery_window_in_days = 0` so a
  short-lived name is never blocked by a previous same-named secret still pending deletion (spec §9).

`data` does not depend on `foundation` (the public-Atlas design needs no VPC/ECR outputs) and manages **no**
Atlas IP allow-list resource — allow-listing is exclusively the manual runbook below (spec §11).

## Connection string composition

```
mongodb+srv://<urlencode(username)>:<urlencode(password)>@<srv_host>/<db_name>?retryWrites=true&w=majority&authSource=admin&appName=<urlencode(app_name)>
```

- `atlas_database_username`, the generated password, and `mongodb_atlas_app_name` are each wrapped in
  `urlencode()` — any of them may contain characters that are not valid unescaped in a URI.
- `authSource=admin` is explicit because the SCRAM user is created with `auth_database_name = "admin"`.
- `mongodb_atlas_srv_host` and `mongodb_database_name` are used as plain host/path segments; their own
  variable validation already restricts them to safe character sets (see `variables.tf`), so they are not
  additionally URL-encoded.

## Atlas Service Account authentication

Credentials are **not** Terraform variables. The empty `provider "mongodbatlas" {}` block reads them from
the Service Account environment variables:

```bash
export MONGODB_ATLAS_CLIENT_ID=...
export MONGODB_ATLAS_CLIENT_SECRET=...
```

The spec's originally documented `MONGODB_ATLAS_PUBLIC_KEY` / `MONGODB_ATLAS_PRIVATE_KEY` names do not match
the current `mongodb/mongodbatlas` provider (verified against the provider's own configuration guide at
implementation time): the current Programmatic Access Key names are `MONGODB_ATLAS_PUBLIC_API_KEY` /
`MONGODB_ATLAS_PRIVATE_API_KEY`, and Service Account (SA) authentication is now the provider's recommended
primary method — used here.

**Required Service Account permission:** the SA must be granted the narrowest sufficient Atlas role on the
target project — **`Project Database Access Admin`** — not `Project Owner` and not an organization-wide
role. `Project Database Access Admin` is sufficient to create and manage a `mongodbatlas_database_user`; it
does not grant cluster, billing, or project-membership management.

Provider version constraints (`versions.tf`) pin the major line only (`~> 6.0` for `aws`, `~> 2.0` for
`mongodbatlas`, `~> 3.0` for `random`). The specific resolved version of each provider is recorded
exclusively by the committed `.terraform.lock.hcl` — this README intentionally does not state a version as
"current," since that text would silently go stale on a future `terraform init -upgrade`.

## Inputs / outputs

- Inputs: `project_name`, `environment`, `common_tags`, `aws_region`, `atlas_project_id`,
  `mongodb_atlas_srv_host`, `mongodb_atlas_app_name`, `atlas_database_username`, `mongodb_database_name`. See
  `../environments/demo/data.tfvars.example`. Every Atlas/Mongo input has an explicit variable validation
  (project ID shape, host-only SRV hostname, non-empty/whitespace-trimmed username, safe database name).
- Outputs: **only** `mongodb_secret_arn`. The secret value is never output.

## Sensitive state and plan warning

- The generated password can land in the Terraform **state**.
- The full `MONGO_URI` can land in the Terraform **state and in a saved plan file**.
- Terraform's `sensitive = true` marking (used where applicable) only masks the normal CLI output — it does
  **not** redact a `terraform show -json` export of a plan or state, and does not encrypt the value at rest
  beyond the state backend's own encryption (HCP Terraform encrypts stored state at rest).
- Treat `tfplan`/`destroy.tfplan` and the remote state with the same care as a credential file.

## Read-only preflight (before every apply)

The Atlas account has **two separate IP access lists** — do not conflate them:

1. **Administration API access list** — an org/project-level restriction on which source IPs may call the
   Atlas Admin API at all. If the current runtime's IP is not allowed here, every `terraform` command
   against the `mongodbatlas` provider fails outright, independent of database connectivity.
2. **Database deployment IP access list** — governs which client IPs may open an actual MongoDB connection
   to the cluster. This is unrelated to Terraform's own API calls; it is the list the manual runbook below
   adds the ECS backend task's public IP to, once the `ecs` stack (#180) exists.

Before applying, verify read-only:

```bash
# Confirm the SA can reach the target project and has sufficient (not broader) permission:
# check via the Atlas UI/API that the SA's role on atlas_project_id is exactly
# "Project Database Access Admin", not Project Owner or an org-wide role.

# Confirm the Administration API access list does not block the current runtime's IP
# (Atlas UI: Organization Access Manager -> API Access List, or the Atlas Admin API
# accessList endpoint for the organization).

# Confirm the target username does not already exist on the project
# (Atlas UI: Database Access, or the Atlas Admin API databaseUsers endpoint).

# Confirm the Secrets Manager name_prefix does not collide with an unexpected existing secret:
aws secretsmanager list-secrets \
  --filters Key=name,Values="<project_name>-<environment>-mongo-uri-"
```

## Order

```bash
terraform login app.terraform.io                                               # once per machine
cd infra/terraform/data
cp ../environments/demo/data.tfvars.example ../environments/demo/data.tfvars   # fill in real Atlas project id / SRV host
export MONGODB_ATLAS_CLIENT_ID=...
export MONGODB_ATLAS_CLIENT_SECRET=...
terraform init                                                                 # cloud block; no -backend-config
terraform plan  -var-file=../environments/demo/data.tfvars -out=tfplan
terraform apply "tfplan"
```

**Sensitive-plan handling rules:**
- `tfplan` is git-ignored and stays local only — never attached to a PR, issue, or chat message.
- `terraform show -json` on a plan or state is run only if strictly necessary for a specific verification,
  never routinely.
- Any temporary JSON scratch file produced that way is deleted immediately after use.
- The secret **value** is never pasted into a terminal report, PR comment, or chat message; post-apply
  verification checks only the secret's **ARN and metadata** (name, `CreatedDate`, version id) — never
  `aws secretsmanager get-secret-value`'s `SecretString`.
- After verification, the applied saved plan file (`tfplan`) is deleted.

Apply/destroy order per spec §13: `bootstrap → account → foundation → data → (publish images) → ecs`.

## Controlled destroy (separate approval required)

```bash
terraform plan \
  -destroy \
  -var-file=../environments/demo/data.tfvars \
  -out=destroy.tfplan
terraform show destroy.tfplan
terraform apply "destroy.tfplan"
```

Post-destroy read-only verification:
- the Atlas database user no longer exists;
- the Secrets Manager secret is gone and not in a pending-deletion state (`recovery_window_in_days = 0`
  means immediate deletion, not scheduled);
- `terraform state list` reports no managed resource;
- the `itassetpulse-data` HCP Terraform workspace is unlocked and has no active run;
- `bootstrap` and `account` infrastructure are untouched;
- the local `destroy.tfplan` is deleted after verification.

## Manual MongoDB Atlas IP allow-list runbook (spec §11)

There is **no Terraform-managed allow-list** and never a `0.0.0.0/0` entry. Because a Fargate task's public
IP is dynamic and only known after the `ecs` stack (#180) exists, allow-listing the **database deployment**
IP access list (not the Administration API one above) is a manual, temporary step, performed once the
backend task is running:

1. `ecs apply` creates the backend service/task and returns immediately (`wait_for_steady_state = false`),
   without waiting for target health.
2. Retrieve the backend task's ENI and current public IP (`aws ecs list-tasks` → `describe-tasks` → ENI →
   `aws ec2 describe-network-interfaces`).
3. Create a **temporary** Atlas project IP access-list entry for that public IP (preferably with an
   expiry/`delete_after_date`).
4. Wait for the backend target and ECS service to become healthy/stable
   (`aws ecs wait services-stable`). `health_check_grace_period_seconds` (configured in `ecs`) prevents
   premature task replacement during this manual window.
5. After the demo, remove the entry or let it expire — this is part of teardown.

**The backend task's public IP must be re-allow-listed after every task replacement or release rollout**,
because a new task receives a new public IP. This has nothing to exercise until #180 lands; it is documented
here because this stack owns the Atlas project wiring that runbook applies to.

Implemented in: **#175**.
