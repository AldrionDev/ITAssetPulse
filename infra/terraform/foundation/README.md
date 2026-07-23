# stack: foundation (remote state, ephemeral)

Platform-agnostic base for compute. Spec: §4.3. State key: `itassetpulse/demo/foundation.tfstate`.

> Documentation-only until issue **#174** adds the Terraform configuration. No `.tf` here yet — do not run
> Terraform against this directory.

## Responsibility

`modules/network` (once) + `modules/ecr-repository` (twice: backend, frontend). Public and private subnets,
**no NAT Gateway in v1**.

## Planned inputs

`project_name`, `environment`, `common_tags`, `aws_region`, `vpc_cidr`, `public_subnet_cidrs`,
`private_subnet_cidrs`, `availability_zone_count`, ECR settings (`scan_on_push`, `lifecycle_keep_count`,
`force_delete`). Values from `../environments/demo/foundation.tfvars`.

## Planned outputs

`vpc_id`, `public_subnet_ids`, `private_subnet_ids`, `backend_ecr_repository_url` + `_arn`,
`frontend_ecr_repository_url` + `_arn`.

Implemented in: **#174**.
