# IT Asset Pulse

> Full-stack IT Asset Management demo application extended into a cloud-native DevOps portfolio project.
> Built with NestJS, React, MongoDB Atlas, Docker, AWS ECS Fargate, ECR, and Terraform.

---

## Overview

IT Asset Pulse is a demo IT Asset Management application designed to showcase both full-stack development and DevOps/cloud engineering skills.

The project started as a NestJS + React application and was extended with a real AWS-based deployment workflow using Terraform, Docker, ECR, ECS Fargate, an Application Load Balancer, and MongoDB Atlas.

It demonstrates:

- Full-stack application development
- JWT authentication and role-based access control
- Dockerized local development
- Production-style container images
- Terraform-managed AWS infrastructure
- Modular, ephemeral ECS Fargate demo infrastructure
- MongoDB Atlas managed database integration
- Cost-conscious cloud infrastructure lifecycle

---

## Tech Stack

### Application

- Backend: NestJS, TypeScript, Mongoose
- Frontend: React, TypeScript, Vite, Tailwind CSS
- Database: MongoDB / MongoDB Atlas
- Authentication: JWT
- Authorization: Role-based access control

### DevOps / Cloud

- Docker
- Docker Compose
- AWS ECR
- AWS ECS Fargate
- AWS Application Load Balancer
- Terraform
- Terraform remote state in S3
- MongoDB Atlas Terraform provider

---

## Core Features

- Asset CRUD
- Asset detail page
- Asset search and filtering
- Dashboard with asset statistics
- Employee management
- Asset assignment to employees
- Asset history / audit log
- QR code generation
- QR code scanner page
- JWT login
- Role-based access control:
  - Viewer: read-only
  - Manager: update assets
  - Admin: full access

---

## Demo Users

Local demo credentials, built into the authentication implementation (not created by the seed command) and **not production credentials**:

| Role    | Username | Password   |
| ------- | -------- | ---------- |
| Admin   | admin    | secret123  |
| Manager | manager  | project123 |
| Viewer  | viewer   | viewer1234 |

---

## Local Development

```bash
git clone https://github.com/AldrionDev/ITAssetPulse.git
cd ITAssetPulse
cp .env.example .env
```

Review and update the values in `.env` before starting the stack.

```bash
docker compose build
docker compose up -d
```

Seed demo data (assets and employees only — the demo login accounts above are already built in):

```bash
docker exec -it asset-backend npm run seed
```

Local URLs:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3000
```

---

## Local Architecture

```text
Browser
  ↓
React Frontend
  ↓
NestJS Backend API
  ↓
MongoDB container
```

---

## Infrastructure Status

The earlier AWS deployment of this project is preserved in the baseline tag `infra-v1-pre-modularization` (e.g. `git show infra-v1-pre-modularization:infra/terraform/README.md`); the infrastructure is now designed as a modular ECS Fargate architecture — see [`docs/infrastructure-modularization-spec.md`](docs/infrastructure-modularization-spec.md) and `infra/terraform/README.md`.

**Current status:**

- The current Terraform remote-state backend exists in AWS S3. Its retirement is tracked by issue #209.
- The demo infrastructure (foundation, data and ECS resources) is currently **not provisioned**; ECS Fargate + ALB is the implemented Terraform target architecture, not a running environment.
- The AWS infrastructure is currently being reviewed and redesigned.
- The HCP Terraform project and four Local execution workspaces were created under #202, while Terraform state migration remains tracked by #203.
- A reusable local Jenkins controller is implemented in the separate `AldrionDev/local-jenkins-platform` repository. ITAssetPulse-specific pipelines are not implemented yet.
- The current architecture and responsibility boundary are documented in [`docs/infrastructure-hcp-jenkins-spec.md`](docs/infrastructure-hcp-jenkins-spec.md) and [`ci/jenkins/README.md`](ci/jenkins/README.md).

This README intentionally does not include Terraform `apply`, `destroy`, or deployment instructions. The redesign is specified in [`docs/infrastructure-modularization-spec.md`](docs/infrastructure-modularization-spec.md).

### Baseline preservation

The full pre-modularization repository state — the old monolithic Terraform configuration and the accepted redesign specification — is preserved under the annotated tag `infra-v1-pre-modularization`.

- Inspect the old infrastructure in an isolated, detached worktree (without disturbing the current checkout):
  `git worktree add --detach ../itassetpulse-baseline infra-v1-pre-modularization`
- View a single file directly, e.g. `git show infra-v1-pre-modularization:infra/terraform/main.tf`.

The new modular infrastructure starts from **clean Terraform state**. The previous local state is not a valid starting point: the old remote-state S3 bucket was deleted, the old bootstrap local state only describes that deleted bucket, and the main stack kept its state remotely (now gone).

Local, git-ignored Terraform artifacts (`terraform.tfvars`, `backend.hcl`, bootstrap state files, and `.terraform/` provider caches) are kept out of Git and are not reused by the redesign. Reference values that may still be needed are backed up only to an out-of-repo, user-controlled location; the provider caches are not backed up (they are regenerated by `terraform init`).

---

## CI/CD

- GitHub Actions performs validation only: backend and frontend lint, test and build, plus AWS-free Terraform format, init and validate checks on pull requests and pushes to `main`.
- A transitional, manually dispatched image-publishing workflow builds the backend and frontend images and pushes them to Amazon ECR under immutable full-SHA tags.
- **No workflow currently deploys to AWS.** ECS infrastructure and service rollout are Terraform-owned and executed manually from a reviewed saved plan.
- The reusable local Jenkins controller is implemented externally, but the ITAssetPulse ECR publishing and manually approved Terraform pipelines remain owned by #206 and #208.
- Jenkins integration details and pipeline ownership are documented in [`ci/jenkins/README.md`](ci/jenkins/README.md).

Full details: [`docs/ci-cd.md`](docs/ci-cd.md).

---

## Project Status

**Application** (current, stable):

- Dockerized local development
- Production-style backend and frontend Docker images
- JWT authentication and role-based access control
- GitHub Actions CI (lint, test, build and Terraform validation)
- Transitional manual image publishing to Amazon ECR

**Infrastructure** (implemented in Terraform, currently not provisioned — see [Infrastructure Status](#infrastructure-status)):

- Modular Terraform roots for networking, ECR, MongoDB Atlas, and the ECS Fargate + ALB demo stack
- MongoDB Atlas database access managed by Terraform

**Planned:**

- Full rebuild of the demo environment
- Jenkins-based release and Terraform execution
- Basic monitoring and automation

---

## Security Notes

Secrets are not committed to Git.

Sensitive values are stored in:

- Local `.env` files for local development
- Local `terraform.tfvars` for Terraform
- AWS Secrets Manager for the application's database credentials
- GitHub Actions secrets and variables for CI/CD configuration

Terraform remote state must be treated as sensitive because it can contain secret values.

---

## Purpose

This project demonstrates my transition from full-stack development into DevOps and cloud engineering.

It shows practical experience with:

- Docker
- AWS
- Terraform
- ECS Fargate
- ECR
- MongoDB Atlas
- Infrastructure as Code
- Cloud deployment troubleshooting
- Cost-aware infrastructure cleanup

The project is intended for portfolio use, DevOps interview preparation, and hands-on cloud learning.

---

## License

This project is for demonstration and educational purposes.
