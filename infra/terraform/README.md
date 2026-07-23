# ITAssetPulse — Terraform infrastructure

Modular Terraform for the ITAssetPulse ephemeral demo. Design of record:
[`docs/infrastructure-modularization-spec.md`](../../docs/infrastructure-modularization-spec.md).

> **The directory structure is intentionally documentation-only after issue #171. Do not run `terraform init`,
> `terraform plan`, or `terraform apply` in these stack directories until the corresponding implementation
> issue adds the Terraform configuration.**

Amazon ECS Fargate is the primary v1 compute platform; EKS is deferred to a later, optional stack. The design
is a consciously ephemeral demo (`apply → demo → destroy`), optimized for minimal idle cost. See the
specification for goals, non-goals, and rationale.

## Layout

```text
infra/terraform/
  modules/
    network/                 # VPC + subnets + IGW + route tables (spec §5.1)
    ecr-repository/          # one ECR repo + lifecycle, IMMUTABLE tags (spec §5.2)
    ecs-fargate-service/     # one Fargate service: task def / service / SG / TG / logs (spec §5.3)
  bootstrap/                 # remote-state infra only; LOCAL state (spec §4.1)
  account/                   # persistent guardrails + GitHub OIDC (spec §4.2)
  foundation/                # network + ECR (spec §4.3)
  data/                      # MongoDB Atlas + Secrets Manager secret (spec §4.4)
  ecs/                       # ECS cluster + services + ALB + routing + observability (spec §4.5)
  environments/
    demo/                    # per-stack *.tfvars for the demo environment
```

## State-key convention

Remote state lives in the S3 bucket created by `bootstrap`. Each remote-state root stack uses a distinct key
via its own `backend.hcl` (partial backend config):

| Stack | State | Key |
|-------|-------|-----|
| `bootstrap` | local | — (creates the bucket) |
| `account` | remote | `itassetpulse/global/account.tfstate` |
| `foundation` | remote | `itassetpulse/demo/foundation.tfstate` |
| `data` | remote | `itassetpulse/demo/data.tfstate` |
| `ecs` | remote | `itassetpulse/demo/ecs.tfstate` |
| `eks` (later) | remote | `itassetpulse/demo/eks.tfstate` |

## Environment convention

- One environment in v1: `demo`. **No Terraform workspaces.**
- Environment-scoped stacks (`foundation`, `data`, `ecs`) take `project_name`, `environment`, `common_tags`,
  and read their values from `environments/<env>/<stack>.tfvars`.
- `bootstrap` and `account` are environment-agnostic (account/region-scoped) and keep their own tfvars.
- Real `*.tfvars`, `backend.hcl`, state files, and `.terraform/` are git-ignored; only `*.example` files are
  tracked.

## Run conventions (only once a stack's implementation issue has added its `.tf`)

```bash
cd infra/terraform/<stack>
cp backend.hcl.example backend.hcl            # then edit (bootstrap uses local state — no backend.hcl)
terraform init -backend-config=backend.hcl
terraform fmt -check
terraform validate
terraform plan  -var-file=../environments/demo/<stack>.tfvars
terraform apply -var-file=../environments/demo/<stack>.tfvars
```

Apply / dependency order: `bootstrap → account → foundation → data → (publish images) → ecs`. See spec §13.

## Implementation map — milestone "Modular ECS Fargate Infrastructure v1"

| Component | Issue |
|-----------|-------|
| Modular structure + monolith removal (this skeleton) | #171 |
| `bootstrap` Terraform config | #172 |
| `account` Terraform config | #173 |
| `modules/network`, `modules/ecr-repository`, `foundation` | #174 |
| `data` Terraform config | #175 |
| CI quality gates | #176 |
| `publish-images.yml` (image publishing) | #177 |
| Application containers for ALB routing | #178 |
| `modules/ecs-fargate-service` | #179 |
| `ecs` core stack | #180 |
| ECS observability | #181 |

## Baseline

The pre-modularization monolithic Terraform is preserved under the annotated tag
`infra-v1-pre-modularization` (see the repository root `README.md`, "Baseline preservation").
