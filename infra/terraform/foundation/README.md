# stack: foundation (remote state, ephemeral)

Platform-agnostic base for compute. Spec: §4.3.
State: HCP Terraform workspace `itassetpulse-foundation` (organization `gabor-toth-personalprojects`),
Local execution mode. Cleanly initialized against HCP Terraform in #203; the former S3 state was verified
empty beforehand and is a retained historical recovery copy only (retired by #209).

> **This workspace has no state snapshot yet.** `terraform state list` therefore exits `1` with
> `No state file was found!` rather than exiting `0` with no output — the workspace has *never* had a state
> version, which is different from holding an empty one. That is expected and must not be "repaired": no
> artificial empty state was uploaded. The first real `terraform apply` creates the first state version.

## What it creates

- `module.network` (once) — VPC, public/private subnets across `availability_zone_count` AZs, Internet
  Gateway, public and private route tables + associations. **No NAT Gateway in v1.** See
  `modules/network/README.md`.
- `module.ecr_backend` / `module.ecr_frontend` (`modules/ecr-repository`, twice) — one ECR repository per
  application component, named `${project_name}-${environment}-backend` / `-frontend`, `IMMUTABLE` tags,
  `force_delete = true` for clean ephemeral teardown (spec §10.4). See `modules/ecr-repository/README.md`.

`foundation` does not depend on any other stack.

## Inputs / outputs

- Inputs: `project_name`, `environment`, `common_tags`, `aws_region`, `vpc_cidr`, `public_subnet_cidrs`,
  `private_subnet_cidrs`, `availability_zone_count`, `scan_on_push`, `lifecycle_keep_count`, `force_delete`.
  See `../environments/demo/foundation.tfvars.example`.
- Outputs: `vpc_id`, `public_subnet_ids`, `private_subnet_ids`, `backend_ecr_repository_url` + `_arn`,
  `frontend_ecr_repository_url` + `_arn`. No secret values.

## Order

```bash
terraform login app.terraform.io                                    # once per machine
cd infra/terraform/foundation
cp ../environments/demo/foundation.tfvars.example ../environments/demo/foundation.tfvars
terraform init                                                      # cloud block; no -backend-config
terraform plan  -var-file=../environments/demo/foundation.tfvars -out=tfplan
terraform apply "tfplan"
```

Apply/destroy order per spec §13: `bootstrap → account → foundation → data → (publish images) → ecs`.
Teardown per demo (spec §13.5): `ecs destroy → data destroy → foundation destroy`. `force_delete = true` lets
`terraform destroy` remove both ECR repositories even if they still contain images.

Implemented in: **#174**.
