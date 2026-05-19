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
docker compose build
docker compose up -d
```

Seed demo data:

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

## Cloud Architecture

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

Terraform manages the main AWS and Kubernetes infrastructure:

- VPC
- Public and private subnets
- Internet Gateway
- NAT Gateway
- ECR repositories
- EKS cluster
- EKS managed node group
- EKS addons
- AWS Load Balancer Controller
- Kubernetes namespace
- Kubernetes deployments and services
- Kubernetes secrets
- Kubernetes ingress
- MongoDB Atlas database user
- MongoDB Atlas IP access rule

---

## Terraform Infrastructure

Terraform configuration is located in:

```text
infra/terraform/
```

Main workflow:

```bash
cd infra/terraform
terraform init -backend-config=backend.hcl
terraform fmt
terraform validate
terraform plan
terraform apply
```

Terraform remote state is stored in an S3 bucket created by the bootstrap configuration:

```text
infra/terraform/bootstrap/
```

Sensitive local files are not committed:

```text
terraform.tfvars
backend.hcl
.env
.terraform/
terraform.tfstate
```

---

## MongoDB Atlas Integration

The cloud deployment uses MongoDB Atlas as a managed database.

Terraform manages:

- MongoDB Atlas provider configuration
- Existing Atlas project reference
- Atlas database user
- Atlas IP access rule for the AWS NAT Gateway public IP
- Kubernetes backend Secret with `MONGO_URI`

The Atlas project and cluster are intentionally not created by Terraform in this demo to avoid accidentally provisioning paid resources.

---

## CI/CD

This project includes a simple GitHub Actions based CI/CD workflow.

The CI workflow validates backend and frontend builds.

The deploy workflow builds Docker images, pushes them to Amazon ECR, and restarts the existing Kubernetes deployments in EKS.

More details:

```text
docs/ci-cd.md
```

## Current DevOps Status

Completed:

- Dockerized local development
- Production-style backend and frontend Docker images
- Terraform foundation and remote state
- AWS networking with public/private subnets
- ECR repositories and image workflow
- EKS cluster and managed node group
- EKS addons and AWS Load Balancer Controller
- Kubernetes application deployment
- AWS ALB ingress
- MongoDB Atlas database access managed by Terraform
- End-to-end cloud deployment verification
- Cloud cost cleanup workflow with `terraform destroy`
- GitHub Actions CI/CD - In progress

In Progress:

- Basic monitoring and automation - in progress

Planned:

- Final architecture, cost-control, and cleanup documentation

---

## Cost Control

This project uses real AWS resources.

Resources such as EKS, EC2 worker nodes, NAT Gateway, and Application Load Balancer can create ongoing costs.

Destroy the demo infrastructure when not in use:

```bash
cd infra/terraform
terraform destroy
```

The Terraform remote state S3 bucket is managed separately and should normally remain in place.

---

## Security Notes

Secrets are not committed to Git.

Sensitive values are stored in:

- Local `.env` files for local development
- Local `terraform.tfvars` for Terraform
- Kubernetes Secrets for EKS deployment
- GitHub Secrets for future CI/CD

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
