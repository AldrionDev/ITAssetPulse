# stack: ecs (remote state, ephemeral)

The ECS Fargate application stack. Spec: §4.5.
State: HCP Terraform workspace `itassetpulse-ecs` (organization `gabor-toth-personalprojects`),
Local execution mode. Cleanly initialized against HCP Terraform in #203; the former S3 state was verified
empty beforehand and is a retained historical recovery copy only (retired by #209).

> **This workspace has no state snapshot yet.** `terraform state list` therefore exits `1` with
> `No state file was found!` rather than exiting `0` with no output — the workspace has *never* had a state
> version, which is different from holding an empty one. That is expected and must not be "repaired": no
> artificial empty state was uploaded. The first real `terraform apply` creates the first state version.

Delivered in two increments: the core increment (#180) creates the cluster, ALB, routing, secrets, and
services; this observability increment (#181) adds CloudWatch alarms, a dashboard, and SNS notification
wiring on top (see "Observability (#181)" below).

## What it creates

- `aws_ecs_cluster.this` — a single demo Fargate cluster. No capacity provider, no EC2 capacity, no
  Container Insights (out of scope for #180).
- `aws_security_group.alb` + explicit ingress/egress rule resources — ingress TCP 80 from `0.0.0.0/0`;
  egress TCP `frontend_container_port` and TCP `backend_container_port`, both to `0.0.0.0/0`. The egress
  rules are **not** scoped to the service modules' own security-group IDs — doing so would only let them be
  created *after* the service modules, leaving a window where a freshly-started task is unreachable from the
  ALB. Instead all three rule resources are created before the ALB (`aws_lb.this` has an explicit
  `depends_on` on all three), and the actual access restriction is enforced on the service side: each
  service module's own security group only accepts ingress from this ALB security group
  (`modules/ecs-fargate-service/security_group.tf`, unchanged from #179).
- `aws_lb.this` — internet-facing ALB in the `foundation` public subnets.
- **Target groups** (frontend, backend) and their **health check configuration** — owned here, not by
  `modules/ecs-fargate-service`. See "Target group ownership" below.
- `aws_lb_listener.http` — HTTP :80, default action forwards to the frontend target group.
- `aws_lb_listener_rule.backend_api` — `/api` and `/api/*` forward to the backend target group with a
  `url-rewrite` transform. See "Routing and URL rewrite" below.
- `aws_secretsmanager_secret.jwt` + `aws_secretsmanager_secret_version.jwt` — a Terraform-generated
  (`random_password`) `JWT_SECRET`, never a hand-written or tfvars value. Same pattern as `data`'s
  `mongo_uri` secret: `name_prefix`, `recovery_window_in_days = 0`.
- `data.aws_ecr_image` digest lookups for both images, driven by `release_sha`. See "Image digest lookup"
  below.
- `module.frontend` / `module.backend` — two explicit `modules/ecs-fargate-service` instances (no
  `for_each`), each with its own execution role.
- **(#181 observability increment)** three `aws_cloudwatch_metric_alarm` resources and one
  `aws_cloudwatch_dashboard` — see "Observability (#181)" below.

## What it reads

`foundation`, `data`, and `account` remote state (`data.terraform_remote_state`, first use of this pattern in
the repo):

- `foundation`: `vpc_id`, `public_subnet_ids`, `backend_ecr_repository_url` + `_arn`,
  `frontend_ecr_repository_url` + `_arn`.
- `data`: `mongodb_secret_arn`.
- `account` **(#181 observability increment only)**: `sns_topic_arn`, consumed by the three alarms'
  `alarm_actions`/`ok_actions`. The core increment (#180) deliberately deferred this read — it had no
  consumer until the alarms existed (`docs/infrastructure-modularization-spec.md` §4.5, §6, §7.1 note this
  split).

Since #203 each read is a `terraform_remote_state` data source with `backend = "remote"` against the
producer's HCP Terraform workspace (`itassetpulse-foundation`, `itassetpulse-data`, `itassetpulse-account`).
There is no `"cloud"` backend for this data source — `"remote"` is the correct and only option. The
`var.state_bucket` input is gone; nothing about these reads is region- or bucket-scoped any more.

Access is granted per workspace: each of the three producers lists `itassetpulse-ecs` as its **only**
remote-state consumer, and `itassetpulse-ecs` shares its state with nobody. No project-wide or
organization-wide sharing is enabled.

**Verified in #203 (Gate 8C).** A targeted, credential-free `terraform plan -target=data.terraform_remote_state.account`
read exactly one data source and succeeded: the refreshed plan state contained exactly one matching
`terraform_remote_state` object whose root-output map contains the `sns_topic_arn` key. The output *value*
was never selected or displayed; no managed-resource change and no unrelated data-source read occurred; no
AWS credential was available; no ECS state version was created. Two caveats worth keeping in mind:

- In Local execution mode the authenticated user token also carries workspace permissions, so this
  functional read is **not** isolated proof that the consumer grant alone enforced access. The HCP consumer
  matrix is separately verified evidence for the sharing configuration.
- `foundation` and `data` have verified ECS-only consumer grants, but **no output read is possible** until
  those roots hold real state snapshots with outputs.

## Target group ownership

The target groups live here, not in `modules/ecs-fargate-service`, because AWS requires a target group to
already be attached to a listener/listener rule before an ECS service can reference it in its
`load_balancer` block. If the reusable module created both the target group and the ECS service, the
module's internal service resource could never be made to depend on a listener rule that the caller builds
*from* the module's own output — that dependency direction isn't expressible across a module boundary.
Keeping the target group next to the ALB/listener it is coupled with, and passing its ARN into the module as
`target_group_arn`, keeps the full `target group → listener/listener rule → ECS service` chain inside one
`terraform apply` with a normal, expressible `depends_on`.

## Routing and URL rewrite

The `cloud-static` frontend image (`frontend/nginx.cloud-static.conf.template`) explicitly 404s any `/api`
request — API routing and prefix-stripping are the ALB's job, not the frontend's, and the backend NestJS app
has no `/api` prefix of its own (`backend/src/main.ts`, no `setGlobalPrefix`). `aws_lb_listener_rule.backend_api`
matches `path_pattern` values `["/api", "/api/*"]` (a single rule covers both) and applies a server-side
`url-rewrite` transform (AWS provider ≥ 6.19, see `versions.tf`):

```
regex   = "^/api/?(.*)$"
replace = "/$1"
```

| Request path      | Rewritten to (backend sees) |
|--------------------|------------------------------|
| `/api`             | `/`                          |
| `/api/`            | `/`                          |
| `/api/health`      | `/health`                    |
| `/api/users`       | `/users`                     |

`GET /health` (no `/api` prefix) does **not** match this rule — it falls through to the listener's default
action, i.e. the **frontend** target group. This is intentional and must be verified explicitly at runtime
(see below); it is not the same request as `GET /api/health`.

## Image digest lookup

`data.aws_ecr_image` looks up each repository by `image_tag = var.release_sha` (a required, validated
40-character lowercase Git commit SHA — no short SHA, branch name, or `latest` accepted). If no image with
that tag has been published (`publish-images.yml` workflow_dispatch), the data source errors and
`plan`/`apply` fails clearly — there is no fallback tag. The final container image passed into each service
module is digest-pinned: `<repository-url>@<image-digest>`.

## JWT secret model

`random_password.jwt_secret` (64 chars, `special = true`) → `aws_secretsmanager_secret.jwt` (`name_prefix`,
`recovery_window_in_days = 0`) → `aws_secretsmanager_secret_version.jwt`. **Trade-off:** the secret value is
plaintext in Terraform state. No write-only argument is used — the AWS provider supports one, but it is
disproportionate complexity for a demo project. This is acceptable because HCP Terraform encrypts stored
state at rest and access is limited to the organization's authenticated members; the value is never output; and
this is the same pattern `data` already uses for the Mongo URI secret. The backend module's `secrets` map
gets `MONGO_URI` (from the `data` remote state) and `JWT_SECRET` (created here); the frontend gets no
secrets.

## Backend health-check grace period

`backend_health_check_grace_period_seconds` defaults to **1200 seconds (20 minutes)**: roughly a 15-minute
Mongoose connection-retry budget (#178) plus a ~5-minute buffer for the operator to complete the manual
MongoDB Atlas IP allow-list step (spec §11) and for NestJS bootstrap to finish, before the ECS service could
otherwise decide to replace the task for failing health checks. A task replacement during this window would
hand the next task a **new** public IP, forcing the operator to redo the allow-list step. For the same
reason:

- `wait_for_steady_state = false` on both services (fixed inside `modules/ecs-fargate-service`, not an
  input) — `apply` does not block waiting for the backend to become healthy.
- No deployment circuit breaker — automatic rollback would fight the intentional manual window rather than
  cooperate with it (see the module's own README for the full rationale).

The frontend has no external dependency; its grace period is fixed at `0` directly in `services.tf`, not
exposed as a variable.

## Two explicit service module instances

`module.frontend` and `module.backend` (no `for_each`). `frontend_desired_count` /
`backend_desired_count` (both default `1`) control task count per service. Both run in the `foundation`
public subnets with `assign_public_ip = true` (no NAT, spec Decision E). `module.frontend` has an explicit
`depends_on` on `aws_lb_listener.http` (its target group is the listener's default action); `module.backend`
has an explicit `depends_on` on `aws_lb_listener_rule.backend_api` (its target group is attached by that
rule) — both satisfy the target-group-behind-a-listener ordering requirement described above.

## Manual MongoDB Atlas IP allow-list runbook (spec §11)

There is **no Terraform-managed allow-list** and never a `0.0.0.0/0` entry. Because a Fargate task's public
IP is dynamic and only known after this stack exists, allow-listing the database deployment IP access list
is a manual, temporary step:

1. `terraform apply` creates the backend service/task and returns immediately
   (`wait_for_steady_state = false`), without waiting for target health.
2. Retrieve the backend task's ENI and current public IP (`aws ecs list-tasks` → `describe-tasks` → ENI →
   `aws ec2 describe-network-interfaces`).
3. Create a **temporary** Atlas project IP access-list entry for that public IP (preferably with an
   expiry/`delete_after_date`).
4. Wait for the backend target and ECS service to become healthy/stable (`aws ecs wait services-stable`).
   `backend_health_check_grace_period_seconds` (1200s) covers the Mongoose retry window plus this manual
   step.
5. After the demo, remove the entry or let it expire — part of teardown.

**The backend task's public IP must be re-allow-listed after every task replacement or release rollout**,
because a new task receives a new public IP. This is documented, intentional demo behavior — not automated.

## Observability (#181)

Three fixed (non-variable) CloudWatch alarms and one dashboard, defined in `observability.tf`:

- `${local.name_prefix}-frontend-healthy-host` / `-backend-healthy-host` — `AWS/ApplicationELB`
  `HealthyHostCount`, dimensions `LoadBalancer` (`aws_lb.this.arn_suffix`) + `TargetGroup` (the matching
  target group's `arn_suffix`), `Maximum` statistic, `< 1` over 5×60s, `treat_missing_data = "breaching"`.
  `Maximum` (not `Minimum`) only fires once every ALB node agrees there are zero healthy targets, avoiding
  noise from a single node's transient, out-of-sync reading; `breaching` missing-data reflects that
  `desired_count = 1` gives each service no redundancy, so a reporting gap is itself a potential outage.
  Intentionally scaling a service's `desired_count` to `0` (without destroying the stack) will trip its
  alarm — an accepted trade-off, since the alarm resource itself survives that case. On a full `ecs destroy`,
  the alarms depend (via `arn_suffix` references) on the ALB/target groups they monitor, so Terraform's
  destroy order normally removes the alarms before those referenced resources — an extra alarm email during
  destroy is therefore not guaranteed, though a short CloudWatch evaluation race is not fully ruled out
  either; an accepted demo trade-off.
- `${local.name_prefix}-alb-target-5xx` — `AWS/ApplicationELB` `HTTPCode_Target_5XX_Count`, dimension
  `LoadBalancer` only (ALB-wide, not per target group — covers 5xx from either target, but **not**
  `HTTPCode_ELB_5XX_Count`, a separate ALB-generated-error metric out of scope here), `Sum` statistic
  (`Minimum`/`Maximum`/`Average` all report `1` for this metric per AWS docs), `>= 5` over one 300s period,
  `treat_missing_data = "notBreaching"` (this metric only publishes a datapoint on a nonzero value, so no
  data means no 5xx — opposite semantics from the healthy-host alarms above).
- All three alarms send both `alarm_actions` and `ok_actions` to `local.sns_topic_arn` (the `account` stack's
  SNS topic, see "What it reads" above); `insufficient_data_actions` is empty. Publishing requires the
  `AllowCloudWatchAlarmsPublish` statement on that topic's policy (`account/sns.tf`, see
  `account/README.md`).
- `aws_cloudwatch_dashboard.this` (`${local.name_prefix}-observability`) — one screen, 6 widgets, 2 columns
  ×3 rows: ECS CPU (frontend+backend, one widget), ECS Memory (frontend+backend, one widget), ALB
  RequestCount, ALB TargetResponseTime, ALB target 5xx, and Target Group Healthy Hosts (frontend+backend, one
  widget, `Maximum` statistic — matching the alarms above so the dashboard reads consistently with what
  actually triggers them). No Container Insights, no custom metrics, no log widgets.

## Inputs / outputs

- Inputs: `project_name`, `environment`, `common_tags`, `aws_region` (the region this ECS stack deploys
  into — it no longer has anything to do with where remote state lives), `release_sha`,
  `frontend_container_port`, `backend_container_port`, `frontend_cpu`/`frontend_memory`,
  `backend_cpu`/`backend_memory`, `frontend_desired_count`, `backend_desired_count`,
  `backend_health_check_grace_period_seconds`, `log_retention_days`. See
  `../environments/demo/ecs.tfvars.example`. `deployment_min_healthy_percent` (100) and
  `deployment_max_percent` (200) are fixed in `services.tf`, not exposed as variables. The #181 alarm
  thresholds/periods/statistics are likewise fixed in `observability.tf`, not variables — a single-environment
  demo has no real caller need to tune them.
- Outputs: `ecs_cluster_name`, `alb_dns_name`, `alb_arn`, `frontend_service_name`, `backend_service_name`,
  `frontend_target_group_arn`, `backend_target_group_arn`, `jwt_secret_arn`, `dashboard_name`. The JWT
  secret **value** is never output. No alarm-name outputs — the three alarm names are deterministic
  (`${local.name_prefix}-<suffix>`) and don't need a Terraform output for a runbook to reference them.

Provider version constraints (`versions.tf`): `aws` is pinned `>= 6.19.0, < 7.0.0` (not just `~> 6.0`)
because the `aws_lb_listener_rule` `transform` block used by `listener.tf` was introduced in 6.19.0; a
looser constraint would validate/format fine but could resolve an incompatible provider on a stale lockfile.
`random` is `~> 3.0`, matching `data`. The committed `.terraform.lock.hcl` records the exact resolved
versions of both.

## Order

```bash
terraform login app.terraform.io                                            # once per machine
cd infra/terraform/ecs
cp ../environments/demo/ecs.tfvars.example ../environments/demo/ecs.tfvars  # fill in real release_sha
terraform init                                                              # cloud block; no -backend-config
terraform plan  -var-file=../environments/demo/ecs.tfvars -out=tfplan
terraform apply "tfplan"
```

Apply/destroy order per spec §13: `bootstrap → account → foundation → data → (publish images) → ecs`.

## Runtime verification (through the ALB only)

The task security groups only accept traffic from the ALB security group — **do not** attempt a direct curl
against a backend task's public IP; every check below goes through the ALB DNS name.

- `GET /` → frontend `index.html`.
- `GET /login` (or another SPA route) → frontend `index.html` (nginx `try_files` fallback, not a 404).
- `GET /api/health` → matches the `/api` listener rule, rewritten to `/health`; backend responds `200` with
  `Content-Type: application/json`, body `{"status":"ok"}`.
- `GET /health` (no `/api` prefix) → falls through to the listener's **default action** → frontend
  `index.html`, **not** the backend health JSON. Verify this explicitly — it is the most likely routing
  mistake to regress.
- A real `/api/...` endpoint (e.g. an auth route) returns a backend response.
- Backend target group health check → `healthy`, only after the Atlas allow-list step above.
- Task definition digest pinning: `aws ecs describe-task-definition` shows `<repo-url>@sha256:...` for both
  containers.
- Second `terraform plan` after apply → `No changes` (idempotency).

## Destroy and preservation

Destroying this stack removes: ECS services, the Terraform-managed task definition revisions, the ECS
cluster, the ALB, the listener/rule, both target groups, both service security groups (module-owned), both
CloudWatch log groups (module-owned), the JWT secret (`recovery_window_in_days = 0` → immediate, so a
following `apply` never blocks on a pending-deletion secret), the three CloudWatch alarms, and the
observability dashboard.

It does **not** touch `foundation`, `data`, `account`, or `bootstrap` state/resources, ECR repositories or
images, MongoDB Atlas, GitHub variables, or local Docker volumes — those live in separate state files. The
`account` stack's persistent SNS topic and its `AllowCloudWatchAlarmsPublish` policy statement also survive
(they are only referenced, never created, by this stack).

Implemented in: **#180** (core stack) and **#181** (this section: alarms, dashboard, SNS wiring, and the
`account` remote-state read for the SNS topic ARN).
