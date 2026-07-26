# stack: foundation (remote state, ephemeral)

Platform-agnostic base for compute. Spec: §4.3. State key: `itassetpulse/demo/foundation.tfstate`.

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
cd infra/terraform/foundation
cp backend.hcl.example backend.hcl                                  # fill in the bootstrap-created bucket
cp ../environments/demo/foundation.tfvars.example ../environments/demo/foundation.tfvars
terraform init -backend-config=backend.hcl
terraform plan  -var-file=../environments/demo/foundation.tfvars -out=tfplan
terraform apply "tfplan"
```

Apply/destroy order per spec §13: `bootstrap → account → foundation → data → (publish images) → ecs`.
Teardown per demo (spec §13.5): `ecs destroy → data destroy → foundation destroy`. `force_delete = true` lets
`terraform destroy` remove both ECR repositories even if they still contain images.

Implemented in: **#174**.
