# module: network

VPC networking for the ITAssetPulse stacks. Instantiated once by `foundation`. Spec: §5.1.

> Documentation-only until issue **#174** adds the Terraform configuration. No `.tf` here yet — do not run
> Terraform against this directory.

## Responsibility

VPC; public and private subnets across multiple AZs; Internet Gateway; public and private route tables and
associations; tags. **No NAT Gateway, Elastic IP, or VPC endpoints in v1, and no `enable_nat_*` toggle** (NAT is
added in a dedicated later change when private-subnet compute is actually built).

## Planned inputs

`project_name`, `environment`, `common_tags`, `vpc_cidr`, `public_subnet_cidrs`, `private_subnet_cidrs`,
`availability_zone_count`.

## Planned outputs

`vpc_id`, `public_subnet_ids`, `private_subnet_ids`, `vpc_cidr` (route table IDs only if a consumer needs them).

Implemented in: **#174**.
