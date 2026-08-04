# ITAssetPulse — Terraform infrastructure

Modular Terraform for the ITAssetPulse ephemeral demo. Design of record:
[`docs/infrastructure-modularization-spec.md`](../../docs/infrastructure-modularization-spec.md).

> **HCP Terraform is the active and authoritative state backend** for `account`, `foundation`, `data` and
> `ecs` (#203) — see [`docs/runbooks/hcp-terraform-workspaces.md`](../../docs/runbooks/hcp-terraform-workspaces.md)
> for the executed migration record. The former S3 state objects are retained historical recovery copies
> only; they are no longer read or written, and retiring them together with the `bootstrap` stack is #209.
>
> The broader move to a local Jenkins execution model is still in progress; see
> [`docs/infrastructure-hcp-jenkins-spec.md`](../../docs/infrastructure-hcp-jenkins-spec.md) for the target
> architecture.

> **The modular Terraform roots are implemented. The `foundation`, `data` and ECS demo resources are currently
> not provisioned in AWS. Any future mutation requires a reviewed saved plan and explicit approval.**

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

## State backend convention

Each remote-state root stack stores its state in its own HCP Terraform workspace, declared by a `cloud`
block in the stack's `backend.tf`. Organization: `gabor-toth-personalprojects`.

| Stack | State | HCP workspace | Execution mode |
|-------|-------|---------------|----------------|
| `bootstrap` | local | — | — (local state; retired by #209) |
| `account` | HCP Terraform | `itassetpulse-account` | Local (CLI-driven) |
| `foundation` | HCP Terraform | `itassetpulse-foundation` | Local (CLI-driven) |
| `data` | HCP Terraform | `itassetpulse-data` | Local (CLI-driven) |
| `ecs` | HCP Terraform | `itassetpulse-ecs` | Local (CLI-driven) |

**Local execution mode** means HCP Terraform stores the state and its version history; `plan` and `apply`
still run on the operator's machine (or, later, on the local Jenkins). HCP Terraform never executes a run.

Remote-state sharing is least-privilege: `itassetpulse-account`, `itassetpulse-foundation` and
`itassetpulse-data` each list `itassetpulse-ecs` as their only remote-state consumer, and `itassetpulse-ecs`
shares its state with nobody. No workspace uses project-wide or organization-wide sharing.

> Historical: before #203 these four roots used an S3 backend with per-stack keys
> (`itassetpulse/global/account.tfstate`, `itassetpulse/demo/{foundation,data,ecs}.tfstate`) supplied through
> a git-ignored `backend.hcl`. Those state objects are retained recovery copies only and are no longer used;
> the `backend.hcl` workflow and the `backend.hcl.example` files are gone.

See [`docs/runbooks/hcp-terraform-workspaces.md`](../../docs/runbooks/hcp-terraform-workspaces.md) for the
project, the sharing configuration, the token lifecycle and the executed migration record.

## Environment convention

- One environment in v1: `demo`. **No Terraform workspaces.**
- Environment-scoped stacks (`foundation`, `data`, `ecs`) take `project_name`, `environment`, `common_tags`,
  and read their values from `environments/<env>/<stack>.tfvars`.
- `bootstrap` and `account` are environment-agnostic (account/region-scoped) and keep their own tfvars.
- Real `*.tfvars`, state files, and `.terraform/` are git-ignored; only `*.example` files are tracked. There
  is no `backend.hcl` any more — the `cloud` block carries the full backend configuration.

## Run conventions (only once a stack's implementation issue has added its `.tf`)

```bash
terraform login app.terraform.io              # once per machine; token stored outside the repository
cd infra/terraform/<stack>
terraform init                                # no -backend-config; the cloud block is complete
terraform fmt -check
terraform validate
terraform plan  -var-file=../environments/demo/<stack>.tfvars
terraform apply -var-file=../environments/demo/<stack>.tfvars
```

`bootstrap` keeps local state and takes no `terraform login` or `cloud` block.

Apply / dependency order: `bootstrap → account → foundation → data → (publish images) → ecs`. See spec §13.

## CI validation

`.github/workflows/ci.yml` runs credential-free quality gates on every pull request and push to `main` —
**neither AWS nor HCP Terraform credentials are ever configured in CI**. `terraform init -backend=false`
skips *backend or HCP Terraform initialization*, so the `cloud` blocks do not make CI reach
`app.terraform.io`. Each currently-implemented root stack has its own job running
`terraform fmt -check -recursive`, `terraform init -backend=false -lockfile=readonly`, and `terraform
validate`:

| Stack / module | CI job |
|----------------|--------|
| `bootstrap` | `terraform-bootstrap-validate` |
| `account` | `terraform-account-validate` |
| `foundation` (+ `modules/network`, `modules/ecr-repository`, fmt-checked directly) | `terraform-foundation-validate` |
| `data` | `terraform-data-validate` |
| `ecs` | `terraform-ecs-validate` |
| `modules/ecs-fargate-service` | `terraform-ecs-fargate-service-validate` |

`modules/network` and `modules/ecr-repository` are fmt-checked directly but not validated standalone — a
module's `terraform validate` is exercised through the root stack that consumes it (`foundation`).

**Ownership rule (Definition of Done for every later Terraform issue):** any issue that adds or changes a
root stack or module must add or update its `fmt -check` + `init -backend=false` + `validate` job in the
same PR. This is part of that issue's Definition of Done, not a follow-up task.

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
| Ephemeral demo lifecycle runbook | #182 |
| Superseded path removal | #183 |

## Baseline

The pre-modularization monolithic Terraform is preserved under the annotated tag
`infra-v1-pre-modularization` (see the repository root `README.md`, "Baseline preservation").
