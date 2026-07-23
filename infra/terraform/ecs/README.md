# stack: ecs (remote state, ephemeral)

The ECS Fargate application stack. Spec: §4.5. State key: `itassetpulse/demo/ecs.tfstate`.

> Documentation-only until issue **#180** adds the core Terraform configuration; observability wiring lands in
> **#181**. No `.tf` here yet — do not run Terraform against this directory.

## Responsibility

ECS cluster; frontend and backend `modules/ecs-fargate-service` instances (`desired_count = 1` each); JWT
Secrets Manager secret + minimal IAM; ECR image **digest lookup** driven by `release_sha`; internet-facing ALB
and ALB security group; HTTP listener; default rule → frontend, `/api` + `/api/*` rule → backend with the
`url-rewrite` transform `^/api/?(.*)$` → `/$1`; CloudWatch log groups, alarms, and one dashboard. Reads
`foundation`, `data`, and `account` remote state (SNS topic ARN from `account`).

## Planned inputs

`project_name`, `environment`, `aws_region`, `release_sha`, frontend/backend sizing (`cpu`, `memory`), alarm
thresholds, `log_retention_days`. Values from `../environments/demo/ecs.tfvars`.

## Planned outputs

`alb_dns_name`, `frontend_service_name`, `backend_service_name`, `dashboard_name`.

Implemented in: **#180** (core stack) and **#181** (observability).
