# CI/CD

This document describes the CI/CD state of the ITAssetPulse repository as it is implemented today.

It intentionally documents only what exists. Planned systems are named as planned, never as implemented.

---

## Summary

| Concern | Owner today |
| ------- | ----------- |
| Build, lint, test and Terraform validation | GitHub Actions (`ci.yml`) |
| Container image publishing to Amazon ECR | GitHub Actions (`publish-images.yml`), transitional and manual |
| AWS infrastructure and ECS service rollout | Terraform, executed manually with reviewed saved plans |
| Application deployment from a workflow | **Nothing — no workflow deploys the application** |

Workflow files currently in the repository:

```text
.github/workflows/ci.yml
.github/workflows/publish-images.yml
```

---

## GitHub Actions CI

File:

```text
.github/workflows/ci.yml
```

Triggered on pull requests and on pushes to `main`.

This workflow configures **no AWS credentials** and performs no AWS API call. Every Terraform job runs with the
backend disabled, so no remote state is read or written.

### Backend job — `backend-build`

Runs in `backend/` on Node.js 20 with npm caching:

```text
npm ci
npm run lint:check
npm test -- --passWithNoTests
npm run build
```

### Frontend job — `frontend-build`

Runs in `frontend/` on Node.js 20 with npm caching:

```text
npm ci
npm run lint
npm run build
```

### Terraform validation jobs

Each job installs Terraform `~1.10.0` and runs `terraform fmt -check -recursive`, `terraform init -backend=false`
and `terraform validate` for its scope:

| Job | Scope |
| --- | ----- |
| `terraform-bootstrap-validate` | `infra/terraform/bootstrap` |
| `terraform-account-validate` | `infra/terraform/account` |
| `terraform-foundation-validate` | `infra/terraform/foundation`, plus `fmt -check` for `modules/network` and `modules/ecr-repository` |
| `terraform-data-validate` | `infra/terraform/data` |
| `terraform-ecs-fargate-service-validate` | `infra/terraform/modules/ecs-fargate-service` |
| `terraform-ecs-validate` | `infra/terraform/ecs` |

`modules/network` and `modules/ecr-repository` are format-checked directly; their `terraform validate` is exercised
through the `foundation` root stack that consumes them.

---

## Transitional image publishing

File:

```text
.github/workflows/publish-images.yml
```

This is the only workflow that authenticates to AWS. It is **transitional, not the final publishing
architecture**.

### Behaviour

- **Manual dispatch only** (`workflow_dispatch`), and only from the `main` branch.
- Takes a **release ref or commit SHA** as input, resolves it to a full commit SHA, and **verifies that the SHA is
  an ancestor of `origin/main`**. A commit outside `main` history is refused.
- Requires the repository variables `AWS_IMAGE_PUBLISH_ROLE_ARN`, `AWS_REGION`, `PROJECT_NAME` and `ENVIRONMENT`;
  a preflight step fails fast when any of them is missing.
- Builds the **backend** and **frontend** Docker images from `./backend` and `./frontend`.
- Pushes them under **immutable full-SHA image tags** — no `latest` tag is produced or used.
- **Idempotent:** it inspects ECR first and skips any image whose SHA tag already exists, so re-running it for an
  already published SHA pushes nothing and does not fail.

### Authentication and its known weakness

The workflow authenticates to AWS by assuming an IAM role through the **shared account-level GitHub OIDC
provider**. That provider is not owned exclusively by this project, which makes the dependency **unstable**:
changes made outside this repository can break image publishing.

Removing this dependency — together with the associated GitHub AWS secrets and variables — is tracked by
**#207**. Until then the workflow stays as-is.

### What it does not do

The workflow **does not deploy the application** and **does not perform any ECS rollout**. Publishing an image has
no effect on a running environment.

---

## Deployment ownership

- **No GitHub Actions workflow currently deploys the application.**
- ECS infrastructure and service rollout are **Terraform-owned**, executed manually from a reviewed saved plan with
  explicit approval.
- The demo infrastructure is **currently not provisioned**: the `foundation`, `data` and `ecs` resources do not
  exist in AWS. ECS Fargate + ALB is the implemented Terraform target architecture, not a running environment.
- The future full rebuild of the demo environment is tracked by **#200**.
- **HCP Terraform** for state and **Jenkins** for release and Terraform execution are planned under the
  "Local Jenkins & HCP Terraform Migration v1" milestone. Neither is implemented.

---

## References

- Target architecture and design of record: [`infrastructure-modularization-spec.md`](./infrastructure-modularization-spec.md)
- Apply / demo / destroy procedure: [`runbooks/ephemeral-demo-lifecycle.md`](./runbooks/ephemeral-demo-lifecycle.md)
- Terraform stack layout, state keys and CI job mapping: [`../infra/terraform/README.md`](../infra/terraform/README.md)
