# IT Asset Pulse

> Full-stack IT Asset Management demo application extended into a cloud-native DevOps portfolio project.  
> Built with NestJS, React, MongoDB Atlas, Docker, AWS EKS, ECR, and Terraform.

---

## Overview

IT Asset Pulse is a demo IT Asset Management application designed to showcase both full-stack development and DevOps/cloud engineering skills.

The project started as a NestJS + React application and was extended with a real AWS-based deployment workflow using Terraform, Docker, ECR, EKS, Kubernetes, AWS Load Balancer Controller, and MongoDB Atlas.

It demonstrates:

- Full-stack application development
- JWT authentication and role-based access control
- Dockerized local development
- Production-style container images
- Terraform-managed AWS infrastructure
- Kubernetes deployment on Amazon EKS
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
- AWS EKS
- Kubernetes
- AWS Application Load Balancer
- AWS Load Balancer Controller
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

## Cloud Architecture (Previously Implemented)

This diagram describes the AWS/Kubernetes architecture built earlier in this project. It is not a currently verified live environment — see [Infrastructure Status](#infrastructure-status) below.

```text
Browser
  ↓
AWS Application Load Balancer
  ↓
Kubernetes Ingress
  ↓
Frontend Service / nginx
  ↓
/api proxy
  ↓
Backend Service
  ↓
NestJS Backend Pod
  ↓
MongoDB Atlas
```

Full resource-level documentation of this architecture (VPC, EKS, ECR, Kubernetes workloads, MongoDB Atlas integration) lives in `infra/terraform/README.md`.

---

## Infrastructure Status

This project previously included a Terraform-managed AWS deployment (VPC, EKS cluster and node group, ECR, AWS Load Balancer Controller, Kubernetes workloads) and a MongoDB Atlas integration. `infra/terraform/README.md` documents what was built — treat it as a record of previously implemented infrastructure; it will need to be updated as part of an upcoming infrastructure review and redesign.

**Current status:**

- The Terraform remote-state S3 bucket that previously tracked this infrastructure has been deleted.
- The AWS infrastructure is currently being reviewed and redesigned.
- Without reconciled state, `terraform plan` may not correctly represent Terraform's ownership and mapping of existing AWS resources.

This README intentionally does not include Terraform `apply`, `destroy`, or deployment instructions. The redesign is specified in [`docs/infrastructure-modularization-spec.md`](docs/infrastructure-modularization-spec.md).

### Baseline preservation

The full pre-modularization repository state — the old monolithic Terraform configuration and the accepted redesign specification — is preserved under the annotated tag `infra-v1-pre-modularization`.

- Inspect the old infrastructure in an isolated, detached worktree (without disturbing the current checkout):
  `git worktree add --detach ../itassetpulse-baseline infra-v1-pre-modularization`
- View a single file directly, e.g. `git show infra-v1-pre-modularization:infra/terraform/main.tf`.

The new modular infrastructure starts from **clean Terraform state**. The previous local state is not a valid starting point: the remote-state S3 bucket was deleted, the old bootstrap local state only describes that deleted bucket, and the main stack kept its state remotely (now gone).

Local, git-ignored Terraform artifacts (`terraform.tfvars`, `backend.hcl`, bootstrap state files, and `.terraform/` provider caches) are kept out of Git and are not reused by the redesign. Reference values that may still be needed are backed up only to an out-of-repo, user-controlled location; the provider caches are not backed up (they are regenerated by `terraform init`).

---

## CI/CD

This project uses GitHub Actions for CI and deployment:

- The CI workflow validates that the backend and frontend build successfully on pull requests and on pushes to `main`.
- The deploy workflow builds Docker images, pushes them to Amazon ECR, and restarts the existing Kubernetes deployments in EKS.

The deploy workflow's target AWS/EKS environment is not currently verified as live — see [Infrastructure Status](#infrastructure-status) above. Full details: `docs/ci-cd.md`.

---

## Project Status

**Application** (current, stable):

- Dockerized local development
- Production-style backend and frontend Docker images
- JWT authentication and role-based access control
- GitHub Actions CI (build validation) and deploy workflow (ECR + EKS rollout)

**Infrastructure** (previously implemented, pending redesign — see [Infrastructure Status](#infrastructure-status)):

- Terraform-managed AWS networking, ECR, EKS cluster and node group, EKS addons, AWS Load Balancer Controller
- Kubernetes application deployment and ALB ingress
- MongoDB Atlas database access managed by Terraform

**Planned:**

- AWS infrastructure review and redesign
- Updated Terraform documentation
- Basic monitoring and automation

---

## Security Notes

Secrets are not committed to Git.

Sensitive values are stored in:

- Local `.env` files for local development
- Local `terraform.tfvars` for Terraform
- Kubernetes Secrets for EKS deployment
- GitHub Secrets for CI/CD deployment credentials

Terraform remote state must be treated as sensitive because it can contain secret values.

---

## Purpose

This project demonstrates my transition from full-stack development into DevOps and cloud engineering.

It shows practical experience with:

- Docker
- AWS
- Terraform
- Kubernetes / EKS
- ECR
- MongoDB Atlas
- Infrastructure as Code
- Cloud deployment troubleshooting
- Cost-aware infrastructure cleanup

The project is intended for portfolio use, DevOps interview preparation, and hands-on cloud learning.

---

## License

This project is for demonstration and educational purposes.
