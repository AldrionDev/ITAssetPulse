# IT Asset Pulse

> Full-stack IT Asset Management (ITAM) application  
> Built with NestJS, React, MongoDB, and Docker  
> Evolving into a cloud-native DevOps project (AWS, EKS, Terraform)

---

## Overview

IT Asset Pulse is a full-stack application that simulates a real-world IT asset management system.

The project demonstrates:
- Backend API development with NestJS
- Modern React frontend
- Role-based access control (RBAC)
- Docker-based local development
- Realistic business workflows
  
---

## Tech Stack

### Backend
- NestJS (TypeScript)
- MongoDB (Mongoose)
- JWT Authentication
- Role-based Authorization (RBAC)

### Frontend
- React (TypeScript)
- Vite
- Tailwind CSS

### DevOps (Current)
- Docker
- Docker Compose

### DevOps (Target Stack)
- AWS ECR (Container Registry)
- AWS EKS (Kubernetes)
- MongoDB Atlas (Managed Database)
- Terraform (Infrastructure as Code)
- GitHub Actions (CI/CD)
- AWS IAM (Security & Access)
- S3 (File storage)
- Prometheus + Grafana (Monitoring)

---

## Core Features

### Asset Management
- Create, update, delete assets
- Asset detail page
- Search and filtering

### Role-Based Access Control (RBAC)
- Viewer → read-only
- Manager → update
- Admin → full access

Backend secured with:
- JWT authentication
- RolesGuard

---

### Dashboard
- Asset statistics
- Category breakdown
- Recently added assets

---

### Asset History
- Audit log of asset changes
- Per-asset history tracking

---

### QR Code System
- Generate QR codes
- Scan QR codes to open asset detail page

---

### Employee Assignment
- Assign assets to employees
- Track department and assignment date

---

## Architecture

### Current (Local)

```text
Frontend (React)
        ↓
Backend API (NestJS)
        ↓
MongoDB (Docker)
````

---

### Target (Cloud / DevOps)

```text
Users
  ↓
Load Balancer / Ingress
  ↓
Frontend (EKS)
  ↓
Backend API (EKS)
  ↓
MongoDB Atlas (Managed DB)

+ AWS ECR (images)
+ Terraform (infra)
+ S3 (file storage)
+ Monitoring stack
```

---

## Local Development

### 1. Clone

```bash
git clone https://github.com/AldrionDev/ITAssetPulse.git
cd ITAssetPulse
```

---

### 2. Build

```bash
docker compose build
```

---

### 3. Run

```bash
docker compose up -d
```

---

### 4. Seed data

```bash
docker exec -it asset-backend npm run seed
```

---

### 5. Access

Frontend:

```
http://localhost:5173
```

Backend:

```
http://localhost:3000
```

---

## Demo Users

| Role    | Username | Password   |
| ------- | -------- | ---------- |
| Admin   | admin    | secret123  |
| Manager | manager  | project123 |
| Viewer  | viewer   | viewer1234 |

---

## Testing

* Tested with Thunder Client / Postman
* Verified:

  * Authentication (JWT)
  * Role-based access control
  * Endpoint protection

Expected responses:

* 200 / 201 → success
* 403 → forbidden
* 401 → unauthorized

---

## Project Structure

```text
backend/
  src/
    assets/
    auth/
    employees/
    asset-history/

frontend/
  src/
    components/
    pages/
    hooks/

infra/ (planned)
  terraform/
  kubernetes/
```

---

## Roadmap

### ✅ Full-stack (Completed)

* [x] Asset CRUD
* [x] Asset detail page
* [x] Dashboard
* [x] Search & filtering
* [x] Employee assignment
* [x] Asset history (audit log)
* [x] JWT authentication
* [x] Backend RBAC (RolesGuard)
* [x] Protected frontend routes
* [x] QR code system
* [x] Admin asset page
* [x] Dockerized setup

---

## 🚧 DevOps Roadmap

### M5 — Docker & Image Prep

* Clean Docker Compose setup
* Add `.env.example`
* Prepare production-ready images

---

### M6 — AWS ECR

* Create private ECR repositories
* Push frontend and backend images
* Document image workflow

---

### M7 — EKS Foundation

* Create EKS cluster
* Configure node groups
* Enable multi-AZ high availability
* Install EKS addons

---

### M8 — EKS Deployment

* Create Kubernetes manifests
* Configure secrets and configs
* Add ingress and load balancing
* Deploy application to EKS

---

### M9 — Managed Database

* Migrate to MongoDB Atlas
* Secure database connection

---

### M10 — IAM & Pod Identity

* Configure AWS IAM roles
* Enable pod-level permissions

---

### M11 — S3 Integration

* Create S3 bucket
* Implement file upload/download

---

### M12 — Terraform

* Add Terraform structure
* Configure remote state (S3 + DynamoDB)
* Provision infrastructure via code

---

### M13 — Automation & Monitoring

* Add backend health endpoint
* Create Lambda-based health checks
* Store reports in S3
* Add monitoring stack

---

## Purpose

This project was built to:

* Practice full-stack development
* Implement backend security (RBAC)
* Work with containerized environments
* Transition into DevOps and cloud engineering

---

## DevOps Direction

The long-term goal is to transform this application into a **cloud-native system** with:

* Kubernetes-based deployment (EKS)
* Infrastructure as Code (Terraform)
* Automated CI/CD pipelines
* Secure IAM-based access control
* Monitoring and observability

---

## License

This project is for demonstration and educational purposes.
