# ITAssetPulse — Infrastructure Modularization Specification (v1)

Status: **Approved design — not yet implemented.**
Scope: Terraform infrastructure redesign for the ITAssetPulse demo. This document is the single source
of truth for the first modularized version. Implementation, GitHub issue creation, commits, and any
mutating AWS/Terraform/Kubernetes commands happen only after this specification is accepted.

---

## 1. Context

ITAssetPulse is a CV / portfolio demo project. Its current infrastructure is a single monolithic Terraform
root under `infra/terraform/` that manages networking, ECR, EKS, Kubernetes application resources, and
MongoDB Atlas in one state. The remote-state S3 bucket was deleted, so the existing state cannot be trusted,
and all previously created AWS resources have been removed. The environment is therefore a clean, greenfield
rebuild; the old Terraform code is reference only, never a migration base.

**Primary compute platform for v1 is Amazon ECS Fargate.** Amazon EKS is intentionally deferred and will be
added later as a separate, optional compute stack. The two compute platforms are never required to run at the
same time.

The AWS account is provided by Codecool for the duration of training and job search. This drives the core
operating model: the infrastructure is applied for a short time before interviews, demonstrated, and then
fully destroyed with `terraform destroy`. Consequently the design optimizes for minimal continuous cost, full
reproducibility, simple build-up and tear-down, and the avoidance of long-lived external dependencies. This is
a **consciously ephemeral demo architecture**, not production infrastructure, and the documentation must never
present its trade-offs as production best practice.

---

## 2. Goals and non-goals

### 2.1 Goals

- Clean, maintainable, modular Terraform that demonstrates real DevOps practice and reads well in a portfolio.
- Reusable modules only where reuse is real; flat, readable root-stack code everywhere else.
- Independently deployable stacks with separate state and one-directional dependencies.
- Safe handling of the lost-remote-state situation via a fresh, greenfield rebuild.
- Gradual, verifiable rebuild in small reviewable increments.
- Cost-conscious, fully reproducible `apply → demo → destroy` lifecycle.
- A structure that later allows an optional EKS compute stack and other AWS runtimes without copying modules.

### 2.2 Deferred scope (planned, later, separate milestones)

Optional `eks` root stack; shared cross-platform observability stack; private-subnet Fargate; NAT Gateway +
Elastic IP; VPC endpoints; ECS autoscaling; custom domain; ACM certificate and HTTPS listener; Route 53 or
external DNS integration; a second environment such as `dev`; Container Insights; X-Ray / distributed tracing;
OpenTelemetry; custom application metrics; log-based metric filters; additional or richer dashboards;
automatic AWS Budget actions; incident-management / escalation integration; secret rotation; cross-account
secret sharing; customer-managed KMS keys; replacing the hardcoded demo users with a real user store; removal
of the unused `ADMIN_USERNAME` / `ADMIN_PASSWORD` configuration; cross-account or multi-region ECR
replication; multi-environment image promotion or release-channel strategy; multi-container / sidecar ECS
tasks; capacity-provider strategy; blue/green deployment; Service Connect / Cloud Map; tighter per-port /
per-destination task security-group egress (v1 uses documented allow-all egress).

Application authentication hardening and cleanup of the dead `ADMIN_*` configuration are a **separate
application-security task**, not part of infrastructure v1.

### 2.3 Explicit non-goals for v1 (consciously avoided anti-patterns)

- Using a moving `latest` tag as a deployment source.
- Any ECS rollout ownership outside Terraform (no parallel `update-service --force-new-deployment` path).
- A generic ECS/EKS compute abstraction, or a universal all-projects ECS service framework.
- Passing arbitrary IAM policy JSON as a module input.
- Broad `Resource = "*"` secret access.
- `0.0.0.0/0` MongoDB Atlas allow-list entries as a normal solution.
- Automatic AWS deployment on every push to `main`.
- Terraform workspaces for environment management.
- Running ECS and EKS simultaneously in v1.
- Production-grade claims about the deliberately ephemeral demo trade-offs.

---

## 3. Architecture decisions and rationale

| # | Decision | Rationale |
|---|----------|-----------|
| A | **Clean greenfield rebuild.** No import, no teardown, no reconciliation. Old code is reference only. | All prior AWS resources and the state bucket were deleted; state is untrustworthy; the goal is a redesign. |
| B | **ECS Fargate first; EKS later, separate, optional.** No generic compute abstraction; ECS and EKS are separate root stacks and separate app-deploy implementations. | Cheapest, simplest, always-teardownable demo; the modular structure showcases platform choice without hiding real differences. |
| C | **One environment (`demo`), parameterized.** No workspaces; separate backend state key and tfvars per environment. Names/tags derive from `project_name` + `environment`. | Only one environment is actually operated; adding another later must not require copying modules or stacks. Separate keys reduce wrong-environment risk and are clearer than workspaces. |
| D | **Separate persistent layer from ephemeral layer.** Persistent: `bootstrap` (remote-state infra only) + `account` (guardrails + CI identity). Ephemeral: `foundation`, `data`, `ecs`. | Cost protection and CI identity must survive `apply → demo → destroy`; the state bucket must exist before any remote-state stack. |
| E | **Public-subnet Fargate, no NAT.** `assign_public_ip = true`; inbound only from the ALB security group. | Near-zero idle networking cost for a short-lived demo; documented as an intentional ephemeral trade-off, not production networking. |
| F | **MongoDB Atlas over its public endpoint; allow-listing is a manual runbook step.** No Terraform-managed IP allow-list; never `0.0.0.0/0`. | Fargate task public IPs are dynamic and only known after the compute stack exists; a temporary manual entry keeps the design honest and cheap. |
| G | **No custom domain / HTTPS in v1.** ALB DNS name over HTTP. | No maintained domain; avoid a persistent DNS dependency for an ephemeral demo. HTTPS is a clean, separate later milestone. |
| H | **AWS Secrets Manager**, owner-owned values, Terraform-generated secrets, ARN-scoped IAM. | Real, demonstrable secret-management practice with clean ECS injection and least-privilege access. |
| I | **Mid-level, cost-aware observability.** No Container Insights. | Credible observability + cost control at effectively no idle cost, fully teardownable. |
| J | **ALB path-based routing with URL rewrite; Terraform-owned, locally-driven rollout; immutable Git SHA + digest pinning.** | Idiomatic ECS + ALB pattern; single declarative owner of deployments; traceable, rollback-capable releases. |

### 3.1 Request path (demo)

```
browser → ALB (HTTP :80)
            ├── default rule            → frontend target group (:80, static SPA)
            └── /api and /api/* rule    → backend target group (:3000)
                     + url-rewrite transform: ^/api/?(.*)$ → /$1
```

The SPA calls a relative `/api` base URL. The backend listener rule matches **both** `/api` and `/api/*` path
patterns, forwards to the backend target group, and the `url-rewrite` transform strips the `/api` prefix before
the request reaches the backend, so the backend keeps its existing root-relative routes. No
`app.setGlobalPrefix('api')` change is required. The transform is `^/api/?(.*)$` → `/$1`, giving:

```
/api            → /
/api/           → /
/api/auth/login → /auth/login
```

The optional `/?` avoids a double slash for the bare/trailing cases. In practice the SPA always calls
`/api/<endpoint>`; matching bare `/api` is defensive.

The ALB `url-rewrite` transform is a server-side rewrite (not an HTTP redirect), available since October 2025
and supported by the Terraform AWS provider `>= 6.19`. The rewrite does not change the routing decision made by
the rule condition.

---

## 4. Root stack responsibilities

Five active stacks (`bootstrap`, `account`, `foundation`, `data`, `ecs`) plus a later optional `eks` stack.

### 4.1 `bootstrap` — local state, one-time, persistent

> **Superseded by the executed target model.** #203 replaced the AWS S3 state backend described in this
> section with HCP Terraform state storage for `account`, `foundation`, `data` and `ecs`. `bootstrap` itself
> was **not** migrated — it keeps local state and is retired outright by #209, once its only remaining
> responsibility (the now-unused S3 state bucket) is no longer needed. See
> [`infrastructure-hcp-jenkins-spec.md`](./infrastructure-hcp-jenkins-spec.md) and
> [`docs/runbooks/hcp-terraform-workspaces.md`](./runbooks/hcp-terraform-workspaces.md) for the executed
> model. This section is kept only as the **historical** description of how the S3 backend worked.

Creates **only** the Terraform remote-state infrastructure:

- S3 bucket for remote state, with versioning and server-side encryption (SSE-S3 / AES256).
- Public access block (all four settings enabled).
- State-locking mechanism (S3 native lockfile via `use_lockfile = true`; no DynamoDB table).
- `lifecycle { prevent_destroy = true }` on the state bucket, so an accidental `terraform destroy` cannot
  delete the shared state store.

The bootstrap uses **local state** and creates nothing else. All other stacks use the S3 backend created here.
Persistent guardrails must **not** depend on a fragile local state after bootstrap, which is why they live in
the separate `account` stack (below), not here.

**State-access IAM contract.** Any identity that runs a remote-state stack needs, on the state bucket and its
objects (including the lock object):

- `s3:ListBucket` on `arn:aws:s3:::<state-bucket>` (optionally condition-scoped to the relevant key prefixes);
- On the **state object** `arn:aws:s3:::<state-bucket>/<key>`: `s3:GetObject`, `s3:PutObject`. **No
  `s3:DeleteObject` on the state object** (state history is preserved; deletion is a deliberate break-glass
  action, not a routine permission).
- On the **lock object** `arn:aws:s3:::<state-bucket>/<key>.tflock` (the native lock object Terraform writes
  next to each state key): `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`.

No KMS permissions are required because encryption is SSE-S3.

**Break-glass deletion.** Because `prevent_destroy` blocks destruction, deliberate removal is a documented
manual procedure: temporarily remove the `prevent_destroy` (or `terraform state rm` the bucket and empty +
delete it out of band), confirming first that no other stack's state is still needed.

**Local bootstrap-state recovery.** The bootstrap state is local and small. Document how to recover or re-adopt
it: keep a safe copy of `bootstrap/terraform.tfstate`; if lost, the bucket can be re-adopted with
`terraform import aws_s3_bucket.<name> <bucket-name>` (and the related bucket sub-resources) rather than
recreated, to avoid a name conflict on the globally unique bucket name.

### 4.2 `account` — remote state, persistent, region/account-scoped

State key: `itassetpulse/global/account.tfstate`.

Persistent guardrails and CI identity that must survive demo teardown:

- Account-level **AWS Budget**: low monthly threshold (for example USD 10), actual-cost alerts at 50% / 80% /
  100%. Documented as a delayed cost signal, not a real-time kill switch. No automatic budget actions in v1.
- Shared **SNS topic** and an **email subscription** confirmed once (not per demo deploy).
- **SNS topic resource policy** allowing AWS Budgets to publish to the topic: principal
  `budgets.amazonaws.com`, action `SNS:Publish`, restricted with `aws:SourceAccount` equal to the current
  account ID and, where practical, `aws:SourceArn` scoped to the budget ARN. This is the narrowest policy that
  still lets budget notifications reach the topic. The email subscription still requires one-time manual
  confirmation.
- **GitHub OIDC provider** for `token.actions.githubusercontent.com` — created only if one does not already
  exist in the shared account (see the preflight in §13, issue 4).
- Minimal **image-publish IAM role** assumable via GitHub OIDC, scoped to ECR push for the project
  repositories.

The `account` stack has no dependency on `foundation`; the publish role scopes ECR permissions by repository
ARN pattern (for example `arn:aws:ecr:<region>:<account>:repository/itassetpulse-*`) so it is valid whether or
not `foundation` currently exists.

### 4.3 `foundation` — remote state, ephemeral

State key: `itassetpulse/demo/foundation.tfstate`. Platform-agnostic base for compute:

- `modules/network`: VPC, public and private subnets across multiple AZs, Internet Gateway, route tables.
  **No NAT Gateway, no Elastic IP, no VPC endpoints** in v1, and **no unused feature toggles** for them.
- `modules/ecr-repository` instantiated twice (backend, frontend), with immutable image tags
  (`image_tag_mutability = "IMMUTABLE"`) and `force_delete = true` (ephemeral teardown; see §10.4).
- Common naming and tags.

`foundation` does not depend on any other stack.

### 4.4 `data` — remote state, ephemeral

State key: `itassetpulse/demo/data.tfstate`. External database wiring:

- `mongodbatlas_database_user` on the existing Atlas project, with a Terraform-generated `random_password`.
- An AWS Secrets Manager secret containing the full `MONGO_URI` connection string the backend actually uses
  (built from the Atlas SRV host, the URL-encoded generated password, and the database name), plus its secret
  version.
- Output: **the secret ARN only**. Never the secret value.

The MongoDB Atlas provider **public/private API keys are not Terraform variables**. They are supplied through
the provider-native environment variables `MONGODB_ATLAS_PUBLIC_KEY` and `MONGODB_ATLAS_PRIVATE_KEY` (or an
equivalent provider-native credential mechanism) and are therefore not part of the stack's variable contract.
Non-secret Atlas identifiers (`atlas_project_id`, `mongodb_atlas_srv_host`, `mongodb_atlas_app_name`,
`atlas_database_username`, `mongodb_database_name`) remain ordinary inputs.

`data` does **not** manage any Atlas IP allow-list resource, and it does **not** depend on `foundation` (the
public-Atlas design needs no VPC or ECR outputs). Atlas allow-listing is exclusively a manual runbook step
(see §11).

### 4.5 `ecs` — remote state, ephemeral

State key: `itassetpulse/demo/ecs.tfstate`. The application stack, delivered in two increments: the core
compute/routing increment reads remote state from `foundation` and `data` only; the observability increment
(alarms, dashboard, SNS wiring — see the last two bullets below) adds a read of the `account` remote state
for the SNS topic ARN. Until the observability increment lands, `ecs` reads only `foundation` and `data`.

- ECS cluster.
- **Target groups** (frontend, backend) and their **health check configuration** (path, interval, timeout,
  healthy/unhealthy threshold, matcher). Owned here, not by `modules/ecs-fargate-service`: AWS requires a
  target group to already be attached to a listener/listener rule before an ECS service can reference it in
  its `load_balancer` block, so the target group must be created next to the ALB/listener that attaches it,
  not inside the reusable service module (which is called before the listener rule that would otherwise need
  to depend on it — a dependency direction that cannot be expressed across a module boundary). `target_type =
  "ip"` (Fargate `awsvpc` requirement).
- `modules/ecs-fargate-service` instantiated twice (frontend, backend), each with `desired_count = 1` and the
  matching target group ARN passed in as `target_group_arn`. Each `module` block carries an explicit
  `depends_on` on the listener rule that attaches its target group, so the target group is guaranteed to be
  "behind" a listener before the module's ECS service is created.
- Internet-facing ALB, ALB security group, HTTP listener. **ALB security-group contract:** ingress TCP 80 from
  `0.0.0.0/0`; egress TCP 80 to the frontend task security group; egress TCP 3000 to the backend task security
  group.
- Default listener rule → frontend target group; a backend listener rule matching `/api` and `/api/*` →
  backend target group with the `url-rewrite` transform `^/api/?(.*)$` → `/$1`.
- `release_sha` input and ECR image **digest lookup** for immutable image pinning.
- JWT Secrets Manager secret (application-owned) and the minimal IAM to read it.
- CloudWatch log groups (7-day retention) — core increment. Alarms and one concise dashboard —
  observability increment.
- SNS topic ARN consumed from the `account` remote state (used by the alarms) — observability increment
  only; the core increment does not read the `account` remote state.

The ALB, listener, and routing rules stay in the root stack (they express this application's specific topology
and are not generic). No DNS alias, no HTTPS, no autoscaling in v1.

### 4.6 `eks` — later, optional

A future separate compute stack over `foundation` + `data`, independent of `ecs`, never required to run at the
same time as `ecs`. Out of scope for v1.

---

## 5. Module contracts

Only three modules. No additional wrapper modules. Naming/tagging is a convention, not a module. Only
**environment-scoped** stacks and modules (`foundation`, `data`, `ecs`, and the three modules) take
`project_name`, `environment`, and `common_tags`, and compute
`local.name_prefix = "${var.project_name}-${var.environment}"`. `bootstrap` and `account` are
environment-agnostic and take no `environment` input.

### 5.1 `modules/network`

Encapsulates the coherent networking resources (justified as a single-instance module for clarity and for the
later NAT milestone).

- Inputs: `project_name`, `environment`, `common_tags`, `vpc_cidr`, `public_subnet_cidrs`,
  `private_subnet_cidrs`, `availability_zone_count` (or explicit AZ list).
- Resources: VPC; public subnets (multi-AZ); private subnets (multi-AZ); Internet Gateway; public route table
  + associations; private route table(s) + associations; required tags.
- Not in v1: NAT Gateway, Elastic IP, VPC endpoints, Transit Gateway, VPN, peering, and **no `enable_nat_*`
  toggle**. NAT support is added in a dedicated later change when private-subnet compute is actually built.
- Outputs: `vpc_id`, `public_subnet_ids`, `private_subnet_ids`, `vpc_cidr`, and route table IDs only if a
  consumer truly needs them. Does not export every internal resource ID.

### 5.2 `modules/ecr-repository`

A single ECR repository and its lifecycle. Instantiated twice by `foundation` (backend, frontend).

- Inputs: `name`, `common_tags`, `scan_on_push`, `lifecycle_keep_count`, `force_delete`. Tag mutability is
  fixed to `IMMUTABLE` inside the module in v1 (not a caller-selectable input).
- Resources: repository; image scanning configuration; tag mutability; lifecycle policy; tags.
- Not in v1: cross-account replication, repository-policy abstraction, multi-region replication, complex
  promotion rules.
- Outputs: `repository_url`, `repository_arn`, `repository_name`.

### 5.3 `modules/ecs-fargate-service`

The shared pattern of the two single-container Fargate services. Used by **two explicit module blocks**
(frontend, backend), not one large `for_each` map, so the differences stay obvious and reviewable.

- Inputs: `name`, `cluster_arn`, `common_tags`, `project_name`, `environment`, `container_image`
  (digest-pinned URI), `container_port`, `desired_count`, `cpu`, `memory`, `public_subnet_ids`,
  `assign_public_ip`, `alb_security_group_id`, `vpc_id`, `environment_variables`, `secrets`
  (name → Secrets Manager ARN), `target_group_arn` (Elastic Load Balancing target group ARN, created and
  attached to a listener/listener rule by the `ecs` root stack — see §4.5), `health_check_grace_period_seconds`,
  `deployment_min_healthy_percent`, `deployment_max_percent`, `log_retention_days`. **No role ARNs are passed
  in. No `health_check_path` input** — health check configuration lives on the target group, which this module
  does not create (§4.5).
- IAM ownership: the module **creates its own task execution role**, grants the standard ECR pull and
  CloudWatch Logs permissions, and derives a **narrowly scoped** `secretsmanager:GetSecretValue` policy from
  exactly the ARNs in the supplied `secrets` map (no `Resource = "*"`). The module does **not** create a task
  role, because the application makes no AWS API calls at runtime; a task role would only be added if a future
  need for AWS API access appears.
- Resources: CloudWatch log group; ECS task definition; ECS service (its `load_balancer` block targets the
  caller-supplied `target_group_arn`); **task execution role + its scoped policies**; service-specific security
  group with **explicit rules** — inbound only from the ALB security group on the container port, and
  **explicit egress** (see below); container port mapping; deployment min/max healthy percentages;
  public-subnet networking with `assign_public_ip`; environment and Secrets Manager injection via the task
  definition `secrets` field. **No target group and no health check configuration** — both are owned by the
  `ecs` root stack (§4.5).
- Egress (explicit, not implicit): the service security group permits the outbound access the tasks actually
  need over the public internet — ECR image pull, CloudWatch Logs, Secrets Manager, DNS, and (backend) the
  MongoDB Atlas endpoint. For v1 this is implemented as **allow-all egress (`0.0.0.0/0`), documented** as an
  accepted ephemeral-demo decision; tighter per-port/destination egress is a deferred hardening (see §2.2).
- Apply behavior: the ECS service sets **`wait_for_steady_state = false`** (fixed in v1, **not** a module
  input), so `terraform apply` creates the service and task and returns without waiting for backend target
  health. This is what enables the manual Atlas allow-list window (see §11).
- Outputs: `service_name`, `security_group_id`, `log_group_name`, `task_definition_arn`, `execution_role_arn`.
  **No `target_group_arn` output** — the module receives the target group ARN as an input, it does not produce
  one.
- Deliberate limits: this is **not** a universal ECS platform module. No arbitrary container count, no sidecar
  abstraction, no capacity-provider combinations, no blue/green, no Service Connect, no Cloud Map, no
  deployment-controller choice, no arbitrary IAM policy JSON input, and no excessive optional dynamic blocks.
  If the frontend and backend needs diverge too much, prefer some repetition over a complex conditional module.

Everything else (ALB, listeners, routing, URL rewrite, target groups, health check configuration, ECR digest
lookup, release-SHA selection, JWT secret, alarms, dashboard, SNS wiring) stays in the `ecs` root stack.

---

## 6. State keys and dependency graph

> **Superseded by the executed target model.** #203 replaced the S3 state keys below with HCP Terraform
> workspaces (`itassetpulse-account`, `itassetpulse-foundation`, `itassetpulse-data`, `itassetpulse-ecs`),
> one per remote-state root — see
> [`docs/runbooks/hcp-terraform-workspaces.md`](./runbooks/hcp-terraform-workspaces.md) for the executed
> migration record. The dependency graph itself (which stack reads which other stack's outputs) is
> unaffected by the backend change and remains accurate. The S3 keys below are kept only as a **historical**
> record of the pre-#203 backend.

```
Historical S3 state keys (superseded by #203):
  bootstrap                          -> local state (unchanged; bootstrap was not migrated)
  itassetpulse/global/account.tfstate
  itassetpulse/demo/foundation.tfstate
  itassetpulse/demo/data.tfstate
  itassetpulse/demo/ecs.tfstate
  itassetpulse/demo/eks.tfstate      (later)
```

```
Dependency graph (one-directional, no cycles):

  bootstrap  ── creates the state bucket used by every remote-state stack

  account    ── persistent; independent of foundation/data/ecs
  foundation ── independent
  data       ── independent of foundation (public-Atlas design)

  ecs        ── core increment reads remote state of: foundation, data
                observability increment adds: account
                (SNS topic ARN comes from the account remote state, observability increment only)

  eks (later)── reads remote state of: foundation, data (and account as needed);
                independent of ecs
```

Each stack reads only earlier, more-stable stacks' outputs via `terraform_remote_state`. No stack reads the
local-state `bootstrap` outputs at plan time; the shared SNS topic ARN is obtained from the `account` remote
state, not copied from bootstrap.

---

## 7. Variables and outputs

Repository contains only `*.tfvars.example` files. Real `*.tfvars`, state files, and `.terraform/` remain
git-ignored and are never committed. `backend.hcl` / `backend.hcl.example` no longer exist for `account`,
`foundation`, `data` and `ecs` — since #203 their backend configuration is a complete `cloud {}` block
committed in `backend.tf`, needing no local override file.

Environment layout:

```
infra/terraform/environments/demo/
  foundation.tfvars
  data.tfvars
  ecs.tfvars
```

`bootstrap` and `account` use their own account/region-scoped tfvars (they are environment-agnostic
persistent layers).

### 7.1 Key inputs per stack (illustrative, finalized during implementation)

- Environment-scoped stacks and modules (`foundation`, `data`, `ecs`) take `project_name`, `environment`, and
  `common_tags`, plus `aws_region`. **`bootstrap` and `account` are environment-agnostic and take no
  `environment` input** (they are persistent, account/region-scoped layers).
- `bootstrap`: `project_name`, `aws_region`.
- `account`: `project_name`, `aws_region`, `budget_limit_usd`, `budget_notification_email`, `github_owner`,
  `github_repo`, `github_oidc_subject_claims`, `create_oidc_provider` (set from the preflight result). No
  `environment`.
- `foundation`: `vpc_cidr`, `public_subnet_cidrs`, `private_subnet_cidrs`, `availability_zone_count`,
  ECR settings (`scan_on_push`, `lifecycle_keep_count`, `force_delete`). Tag mutability is fixed to `IMMUTABLE`
  inside `modules/ecr-repository` (not a caller input).
- `data`: `atlas_project_id`, `mongodb_atlas_srv_host`, `mongodb_atlas_app_name`, `atlas_database_username`,
  `mongodb_database_name`. The Atlas **API keys are not variables** — they come from the provider environment
  variables (see §4.4). The database password is generated (`random_password`), not supplied.
- `ecs`: `release_sha`, `frontend`/`backend` sizing (`cpu`, `memory`), log retention (core increment); alarm
  thresholds (observability increment). The SNS topic ARN is read directly from the `account` remote state
  (observability increment only), not passed as a variable.

### 7.2 Key outputs per stack

- `bootstrap`: `state_bucket_name`, `state_bucket_region`.
- `account`: `sns_topic_arn`, `budget_name`, `github_oidc_provider_arn`, `image_publish_role_arn`.
- `foundation`: `vpc_id`, `public_subnet_ids`, `private_subnet_ids`, `backend_ecr_repository_url` + `_arn`,
  `frontend_ecr_repository_url` + `_arn`.
- `data`: `mongodb_secret_arn` (ARN only, never the value).
- `ecs`: `alb_dns_name`, `frontend_service_name`, `backend_service_name`, `dashboard_name`. Never any secret
  value.

Sensitive values are never exposed as plain outputs.

---

## 8. IAM boundaries

- **GitHub OIDC publish role (`account`):** trust policy limited to the project repository
  (`AldrionDev/ITAssetPulse`) with a scoped `sub` claim (branch/tag/environment, finalized during
  implementation). Permissions: ECR push to the project repositories by ARN (`BatchCheckLayerAvailability`,
  `InitiateLayerUpload`, `UploadLayerPart`, `CompleteLayerUpload`, `PutImage`, `BatchGetImage`,
  `DescribeImages`) plus `ecr:GetAuthorizationToken` (which requires `Resource = "*"`, action-scoped). No ECS,
  no Terraform, no broad admin.
- **ECS task execution role (created by `modules/ecs-fargate-service`):** ECR pull, CloudWatch Logs write, and
  `secretsmanager:GetSecretValue` restricted to exactly the ARNs in the service's `secrets` map — for the
  backend, the DB secret ARN (from `data`) and the JWT secret ARN (created in `ecs`). **No `Resource = "*"`
  for secrets.** Each service owns its own execution role; no role ARN is passed into the module.
- **ECS task role:** not created — the application makes no AWS API calls at runtime. A task role is added
  only if a future need for AWS API access appears.
- **SNS topic policy (`account`):** allows `budgets.amazonaws.com` to `SNS:Publish`, restricted by
  `aws:SourceAccount` (current account) and, where practical, `aws:SourceArn` (the budget ARN).
- **State access:** identities running remote-state stacks use the S3 state/lock IAM contract defined in §4.1.
- The AWS account ID is always obtained from `aws_caller_identity`, never hardcoded.

---

## 9. Secret lifecycle

- Store: **AWS Secrets Manager**, AWS-managed default encryption key (no customer-managed KMS in v1).
- Ownership: the DB-connection secret (`MONGO_URI`) is owned by `data`; the `JWT_SECRET` is owned by `ecs`.
  Each value is Terraform-generated (`random_password`), never a hand-written, version-controlled tfvars value.
- Backend secret inventory verified from application code: the backend uses **only** `MONGO_URI`
  (`src/app.module.ts`) and `JWT_SECRET` (`src/auth/*`). `ADMIN_USERNAME` / `ADMIN_PASSWORD` are dead
  configuration (login uses a hardcoded `demoUsers` array) and get **no** secret. `APP_ENV`, `AWS_REGION`, and
  `PORT` are unused by the backend and are not carried forward.
- Injection: the ECS task definition `secrets` field references the Secrets Manager ARNs; secret values never
  appear in the task definition `environment` block or in Terraform outputs.
- Connection string: the generated MongoDB password is URL-encoded when composed into `MONGO_URI`.
- Atlas provider credentials (public/private API keys) are **not** Terraform variables and never enter state as
  inputs; they are provided via the provider environment variables (§4.4).
- Recreation safety for the frequent `apply → destroy` cycle:
  - Use immediate deletion appropriate to an ephemeral environment (`recovery_window_in_days = 0`).
  - Use `name_prefix` (rather than a fixed `name`) so a short-lived name is not reused while a previous
    same-named secret is still pending deletion.
- State security: Terraform-managed secret values land in the encrypted remote state. Therefore the state
  bucket uses server-side encryption, blocks public access, is reachable only through narrow IAM, and neither
  state nor real tfvars are committed. Values are never surfaced as outputs.

---

## 10. Deployment and image flow

Single declarative owner: **Terraform owns the ECS task definitions and service deployments.** There is no
`aws ecs update-service --force-new-deployment` path and no `ignore_changes` on the task-definition image.

### 10.1 Image publishing — `publish-images.yml`

> **Superseded by the planned target model.** GitHub OIDC-based publishing described below is planned to be
> replaced by a Jenkins release pipeline authenticating through a project-specific IAM role. See
> [`infrastructure-hcp-jenkins-spec.md`](./infrastructure-hcp-jenkins-spec.md). This section remains accurate
> for the **current, transitional** implementation.

- Manual `workflow_dispatch` GitHub Actions workflow.
- Authenticates to AWS via **GitHub OIDC** (assumes the `account` publish role). No long-lived AWS access-key
  GitHub secrets.
- Input: a Git ref or commit SHA. Builds the backend and frontend images, tags **both** with the same full Git
  commit SHA, and pushes to the existing ECR repositories. No `latest` tag in v1.
- Does **not** touch ECS and does **not** run Terraform.
- The full published commit SHA is shown clearly in the workflow summary.

### 10.2 Terraform release input and digest pinning

- The `ecs` stack takes a `release_sha` variable (backend and frontend share the same commit in v1).
- Repository URLs come from the `foundation` remote-state outputs.
- Preferred: Terraform looks up the image published under `release_sha` and pins the task definition by
  **digest** (`repository-url@sha256:<digest>`) using `data "aws_ecr_image"`. If a required image is not yet
  published, `apply` fails clearly (the data source errors).
- If digest lookup proves disproportionately complex during implementation, a direct Git SHA tag is an
  acceptable fallback, but digest pinning is preferred.
- A new task-definition revision and the service rollout happen only during `terraform apply`.

### 10.3 CI (pull requests / pushes to `main`)

No AWS access. Quality gates only:

- backend build, lint, tests;
- frontend build, lint;
- `terraform fmt -check`;
- per-stack `terraform init -backend=false` + `terraform validate`.

CI does not deploy automatically.

### 10.4 ECR teardown behavior

Because `foundation` is destroyed after demos and the repositories contain images, the ECR repositories use an
explicit ephemeral strategy: **`force_delete = true`**, so `terraform destroy` removes them cleanly. Rollback
images are retained only while the current `foundation` / ECR exists; after a full teardown, images must be
republished before the next `ecs` apply.

---

## 11. MongoDB Atlas allow-list runbook (manual, per demo)

Atlas is reached over its public endpoint. There is **no Terraform-managed allow-list** and never a
`0.0.0.0/0` entry. Because the Fargate task's public IP is dynamic and only known after the compute stack
exists, allow-listing is a manual, temporary step:

1. `ecs apply` — creates the service and task and **returns immediately** (the service sets
   `wait_for_steady_state = false`, §5.3), without waiting for backend target health.
2. Retrieve the backend task's ENI and its current public IP
   (`aws ecs list-tasks` → `describe-tasks` → ENI → `aws ec2 describe-network-interfaces`).
3. Create a **temporary** Atlas project IP access-list entry for that public IP (preferably with an expiry /
   `delete_after_date`).
4. Wait for the backend target and ECS service to become healthy/stable (the runbook may use
   `aws ecs wait services-stable`). `health_check_grace_period_seconds` prevents premature task replacement
   during this manual window.
5. After the demo, remove the entry or let it expire. Removing the entry is part of teardown.

The v1 startup sequence is intentionally simple and retry-based:

```
Fargate task starts and receives its ENI / public IP
→ NestJS / Mongoose continues connection retries
→ operator adds the public IP to Atlas
→ MongoDB connection succeeds
→ NestJS bootstrap completes
→ /health returns 200
→ ALB target becomes healthy
```

The backend ECS service is configured with a sufficient **health-check grace period**
(`health_check_grace_period_seconds`) and a **sufficiently long Mongoose connection retry window**, so the task
stays alive while the operator performs the manual allow-list step. `/health` and the ALB target become
healthy only after the database connection succeeds and bootstrap completes; the design does **not** require
`/health` to be reachable before the allow-list entry exists.

**The backend task public IP must be allow-listed on initial deployment and again after every task replacement
or release rollout**, because a new task receives a new public IP. This is documented as an intentional
ephemeral-demo operational step.

---

## 12. Application-container prerequisite

A small application/packaging change is required before the ECS stack, delivered as a separate application PR
(no Terraform; no existing business API route or global route prefix is changed — the only new backend route
is the dedicated `GET /health` endpoint):

- **Frontend cloud-static packaging.** Local Docker Compose keeps its Nginx `/api` proxy. On ECS the ALB
  performs `/api` routing, so the cloud frontend image serves the static SPA only and must not try to resolve
  a non-existent backend Nginx upstream. Preferred approach: a build target or a build-time-selected Nginx
  configuration (`local-proxy` vs `cloud-static`). Do not introduce service discovery only so a redundant
  cloud proxy can resolve. The SPA continues to use its relative `/api` base URL.
- **Backend health endpoint and startup.** Add a minimal explicit `GET /health` endpoint returning HTTP 200,
  used by the backend target-group health check (a 404-based health check is explicitly not the final design).
  The ALB target becomes healthy only after NestJS bootstrap completes, which in v1 happens after the MongoDB
  connection succeeds (that is, after the manual allow-list step, §11); `/health` is **not** required to be
  reachable before allow-listing. The application prerequisite must: verify the actual current Mongoose retry
  and failure behavior; ensure the backend process stays alive long enough for the manual allow-list step;
  configure a sufficiently long connection retry window aligned with `health_check_grace_period_seconds`; and
  verify successful HTTP startup once Atlas access is available. Introduce lazy / non-blocking database
  initialization **only** if the existing retry-based startup cannot reliably stay alive; do not add
  unnecessary database architecture solely to expose `/health` before allow-listing (see §11 and §16).

No existing business API route or global route prefix is changed. The only new backend route is the dedicated
`GET /health` endpoint; the ALB `url-rewrite` transform removes the `/api` prefix for the existing routes.

---

## 13. Apply / destroy order and preflight

> **Superseded by the planned target model.** The OIDC preflight check in §13.1 and the apply order in §13.2
> are planned to change once Terraform execution moves to HCP Terraform (Local execution mode) and Jenkins,
> and the GitHub OIDC dependency is removed. See
> [`infrastructure-hcp-jenkins-spec.md`](./infrastructure-hcp-jenkins-spec.md). This section remains accurate
> for the **current** apply model.

### 13.1 Shared-account preflight (read-only, before the `account` stack)

Because the AWS account is shared (Codecool), run a read-only preflight and do not assume permissions or
uniqueness:

- current caller identity and effective permissions (`aws sts get-caller-identity`);
- whether a GitHub OIDC provider for `token.actions.githubusercontent.com` already exists (an account can hold
  only one per URL — if present, data-source it and set `create_oidc_provider = false` instead of creating a
  duplicate);
- required service quotas;
- Budget / SNS / IAM permissions available to the current identity.

Never hardcode the AWS account ID; obtain it via `aws_caller_identity`.

### 13.2 First full deployment order

```
bootstrap apply            (once; local state; remote-state bucket + locking)
account apply              (once; persistent guardrails + OIDC + publish role)
foundation apply           (VPC/subnets/ECR)
data apply                 (Atlas user + generated password + Secrets Manager DB secret)
publish images             (workflow_dispatch: build + push backend/frontend for the chosen SHA)
ecs apply -var release_sha (cluster + services + ALB + routing + observability)
<manual Atlas allow-list runbook, §11>
<application demo>
```

### 13.3 New application version

```
publish images for the new commit SHA
→ ecs apply with the new release_sha
→ identify the new backend task and its public IP
→ add the new IP temporarily to the Atlas access list
→ wait for the new backend target and ECS service to become healthy
→ remove the previous task IP after the old task has stopped
```

### 13.4 Rollback

```
ecs apply with a previously published release_sha
→ identify the new backend task and its public IP
→ add the new IP temporarily to the Atlas access list
→ wait for the new backend target and ECS service to become healthy
→ remove the previous task IP after the old task has stopped
```

This is the same sequence as §13.3, and consistent with §11: every task replacement or release rollout gets a
new public IP that must be allow-listed. No rebuild is needed if the previous immutable images still exist in
ECR.

### 13.5 Teardown (per demo)

```
ecs destroy
data destroy
foundation destroy
<remove/expire the Atlas allow-list entry>
```

`bootstrap` and `account` are persistent and are not destroyed per demo.

---

## 14. Verification requirements (v1 Definition of Done)

The milestone is done only when the following runs reproducibly and is documented:

```
persistent bootstrap
→ account apply
→ foundation apply
→ data apply
→ immutable images publish
→ ecs apply (release_sha)
→ temporary Atlas IP allow-list
→ application demo
→ ecs destroy
→ data destroy
→ foundation destroy
→ remaining-AWS-resource verification
```

The demo verification covers: frontend load; login; backend API; MongoDB connectivity; logs; dashboard; alarm
configuration; rollback to a previous SHA; a post-destroy AWS resource inventory; confirmation that no
cost-bearing resources remain (persistent `bootstrap` / `account` guardrails excepted); and confirmation that
the temporary MongoDB Atlas IP allow-list entry has been removed or has expired.

The goal is not production infrastructure, but a professionally correct, cost-conscious, short-lived, fully
rebuildable interview demo environment.

---

## 15. Proposed milestone and issue list

Milestone: **Modular ECS Fargate Infrastructure v1**.

Each issue: one clearly bounded responsibility; ideally one reviewable PR; includes scope, Definition of Done,
and verification steps; does not mix application, CI/CD, and infrastructure changes unless the integration
truly requires it; documents its dependencies with an explicit `Depends on`. Issues, milestone, branches, PRs,
and any mutating commands are created only after this specification is accepted, using the `gh` CLI, working
one unblocked issue at a time.

1. **Preserve the previous infrastructure baseline.** Annotated tag `infra-v1-pre-modularization` on the clean
   `main`; push the tag; safely inventory/back up local ignored Terraform files; document that the old local
   state is unusable for the new infrastructure. No application change. *(Depends on: none.)*
2. **Define the modular Terraform structure and remove the old monolithic root.** Create the new
   `infra/terraform/` directory skeleton (documented stack and module boundaries, state-key naming, environment
   convention, base README and run conventions) and, in the same change, **remove the old tracked monolithic
   Terraform root files**, so the working tree never holds two apparently active Terraform implementations. The
   old code remains available via the baseline tag and history. Creates no AWS resources. *(Depends on: 1.)*
3. **Rebuild the Terraform remote-state bootstrap.** S3 bucket, versioning, encryption, public access block,
   state locking, and bootstrap usage/recovery documentation. Bootstrap remains separate from application
   infrastructure. *(Depends on: 2.)*
4. **Shared-account preflight and persistent account stack.** Read-only preflight (§13.1) first; then the
   `account` stack: AWS Budget, SNS topic, documented email subscription confirmation, GitHub OIDC provider
   (or data-source an existing one), and the minimal image-publish IAM role. No ECS deployment and no
   image-publish workflow here. Kept separate from the remote-state bootstrap. *(Depends on: 3.)*
5. **Network and ECR foundation.** `modules/network`, `modules/ecr-repository`, and the `foundation` root
   stack; public and private subnets with no NAT Gateway; backend and frontend ECR repositories with
   `force_delete = true` and lifecycle policies; required outputs; apply/destroy verification.
   *(Depends on: 3.)*
6. **MongoDB Atlas data stack.** Atlas database user, Terraform-generated password, Secrets Manager DB secret
   (ARN-only output). No Terraform allow-list; the manual temporary allow-list runbook is documented here. No
   application route or runtime change. *(Depends on: 3.)*
7. **AWS-free application and Terraform CI quality gates.** PR/push CI with no AWS access: backend build,
   lint, tests; frontend build, lint; `terraform fmt -check`; per-stack `terraform init -backend=false` +
   `terraform validate` (extended as stacks land). No automatic deploy. *(Depends on: 2.)*
8. **Immutable ECR image publishing through GitHub OIDC.** Manual `workflow_dispatch` workflow authenticating
   via GitHub OIDC (assuming the `account` publish role); backend and frontend image build; full Git SHA tags;
   ECR push; no Terraform and no ECS rollout; the old access-key deploy model is not used. *(Depends on: 4, 5.)*
9. **Prepare the application containers for ALB routing.** Frontend cloud-static Nginx packaging (local Compose
   `/api` proxy preserved); the ECS image must not require a backend Nginx upstream; add the minimal backend
   `GET /health` endpoint and confirm the startup / retry behavior (§11, §12). Separate application/packaging
   PR, no Terraform; **no existing business API route or global route prefix is changed — the only new backend
   route is `GET /health`.** *(Depends on: none functionally; must land before 11.)*
10. **Reusable ECS Fargate service module.** `modules/ecs-fargate-service`: task definition, service, target
    group, task security group (explicit ingress/egress), log group, self-created task execution role,
    environment and Secrets Manager injection; only the inputs the frontend/backend actually need. Does not
    build full application ALB routing. *(Depends on: 5.)*
11. **ECS core application stack.** `ecs` cluster; frontend and backend service module instances; JWT Secrets
    Manager secret and minimal IAM; ECR image digest lookup and `release_sha`; ALB, ALB security group (§4.5),
    HTTP listener; default frontend route and the `/api` + `/api/*` backend rule with the URL-rewrite transform
    (`^/api/?(.*)$` → `/$1`); core ECS apply verification. May be further split into *ECS compute and services*
    and *ALB and routing* if one PR grows too large. *(Depends on: 4, 5, 6, 8, 9, 10.)*
12. **ECS observability integration.** CloudWatch alarms (backend/frontend healthy-host count and target 5xx),
    the concise dashboard, and SNS notification wiring using the `account` topic ARN. *(Depends on: 11.)*
13. **End-to-end ephemeral demo verification and runbook.** The complete `apply → demo → destroy` verification
    (§14) documented as a reproducible runbook, including the Atlas allow-list steps, allow-list cleanup, and a
    rollback to a previous SHA. *(Depends on: 12.)*
14. **Remove remaining superseded paths.** After issue 13 confirms the new ECS path works end to end, remove the
    superseded deployment workflow (`.github/workflows/deploy.yml`), stale documentation, and any other
    remaining legacy references. (The old monolithic Terraform root files are already removed in issue 2.) The
    final repository keeps `infra/terraform/` as the new modular infrastructure only; the old system's
    reference is the Git tag and history. *(Depends on: 13.)*

Final issue count is expected to be around 14; the exact number is not forced — reviewable responsibility
boundaries matter more than the count. The milestone closes only when the full `apply → demo → destroy`
lifecycle has been documented as passing.

---

## 16. Implementation-time verifications (non-blocking)

- **Provider inventory and lock files.** v1 uses at least `hashicorp/aws`, `mongodb/mongodbatlas`, and
  `hashicorp/random`. Add `hashicorp/tls` **only if** the selected GitHub OIDC thumbprint approach requires it
  (prefer the approach that does not). No `kubernetes` or `helm` providers. Minimum AWS provider `>= 6.19` for
  the ALB `url-rewrite` listener-rule transform; re-verify Terraform `required_version` and provider versions
  at implementation start. Commit a `.terraform.lock.hcl` for **every** root stack.
  Per stack: `bootstrap`/`foundation` → `aws`; `data` → `aws` + `mongodbatlas` + `random`; `ecs` → `aws` +
  `random`; `account` → `aws` (+ `tls` only if required).
- **Backend startup behavior.** Verify the actual `@nestjs/mongoose` retry and failure behavior, and that the
  backend process stays alive (retrying) long enough for the manual Atlas allow-list step, with the retry
  window aligned to `health_check_grace_period_seconds`. The target becomes healthy after the DB connection
  succeeds and bootstrap completes; `/health` need not be reachable earlier. Add lazy / non-blocking DB
  initialization only if retry-based startup cannot reliably stay alive (§11, §12).
- Confirm the backend `/health` endpoint contract (HTTP 200; dedicated route; no business route or global
  prefix change).
- ALB routing is fixed: backend rule conditions `/api` and `/api/*`; transform `^/api/?(.*)$` → `/$1`
  (`/api`→`/`, `/api/`→`/`, `/api/auth/login`→`/auth/login`). Verify the regex features used are supported by
  ALB rule transforms during implementation.
- Confirm the digest-lookup approach (`data "aws_ecr_image"`), with the direct SHA tag as a documented
  fallback.
- Re-evaluate concrete values before carrying them from the old code: region (`eu-north-1`), VPC CIDR
  (`10.0.0.0/16`), the two public and two private subnet CIDRs, AZ count, naming/tagging, ECR settings. Keep
  only what fits the ECS-first ephemeral demo; nothing is treated as immutable legacy.
- Confirm the MongoDB Atlas provider credential environment variables at implementation start
  (`MONGODB_ATLAS_PUBLIC_KEY` / `MONGODB_ATLAS_PRIVATE_KEY` or the provider-native equivalent).
- Finalize the GitHub OIDC trust `sub` claim during implementation.
- Provide the Budget notification email at `account` apply time (never committed).
- When a service's `secrets` map is empty, do not create an empty Secrets Manager IAM policy (attach the
  `GetSecretValue` policy only when there is at least one secret ARN).
- Create the ALB security-group egress rules (to the frontend and backend task security groups, §4.5) as
  **separate security-group-rule resources** wired after the service module's task-SG outputs are available,
  to avoid a Terraform dependency cycle between the ALB SG and the task SGs.
- Define idempotent rerun behavior for immutable image publication: if both images for the selected SHA already
  exist in ECR, the publish workflow exits clearly and idempotently rather than attempting to overwrite the
  immutable tags.
