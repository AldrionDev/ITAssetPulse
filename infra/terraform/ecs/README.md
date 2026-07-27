# stack: ecs (remote state, ephemeral)

The ECS Fargate application stack. Spec: §4.5. State key: `itassetpulse/demo/ecs.tfstate`.

> Documentation-only until issue **#180** adds the core Terraform configuration; observability wiring lands in
> **#181**. No `.tf` here yet — do not run Terraform against this directory.

## Responsibility

ECS cluster; **target groups (frontend, backend) and their health check configuration** (owned here, not by
`modules/ecs-fargate-service` — see below); frontend and backend `modules/ecs-fargate-service` instances
(`desired_count = 1` each) called with the matching `target_group_arn` and an explicit `depends_on` on the
listener rule that attaches it; JWT Secrets Manager secret + minimal IAM; ECR image **digest lookup** driven by
`release_sha`; internet-facing ALB and ALB security group; HTTP listener; default rule → frontend, `/api` +
`/api/*` rule → backend with the `url-rewrite` transform `^/api/?(.*)$` → `/$1`; CloudWatch log groups, alarms,
and one dashboard. Reads `foundation`, `data`, and `account` remote state (SNS topic ARN from `account`).

**Target group ownership.** The target groups live here, not in `modules/ecs-fargate-service`, because AWS
requires a target group to already be attached to a listener/listener rule before an ECS service can reference
it in its `load_balancer` block. If the reusable module created both the target group and the ECS service, the
module's internal service resource could never be made to depend on a listener rule that the caller builds
*from* the module's own output — that dependency direction isn't expressible across a module boundary. Keeping
the target group next to the ALB/listener it is coupled with, and passing its ARN into the module as
`target_group_arn`, keeps the full `target group → listener/listener rule → ECS service` chain inside one
`terraform apply` with a normal, expressible `depends_on`.

## Planned inputs

`project_name`, `environment`, `aws_region`, `release_sha`, frontend/backend sizing (`cpu`, `memory`), alarm
thresholds, `log_retention_days`. Values from `../environments/demo/ecs.tfvars`.

## Planned outputs

`alb_dns_name`, `frontend_service_name`, `backend_service_name`, `dashboard_name`.

Implemented in: **#180** (core stack) and **#181** (observability).
