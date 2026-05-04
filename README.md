# IT Asset Pulse

> Full-stack IT Asset Management (ITAM) demo application  
> Built with NestJS, React, MongoDB, and Docker  
> 🚧 DevOps extension in progress (AWS, Terraform, Monitoring)

---

## 🚀 Overview

IT Asset Pulse is a full-stack demo application that simulates a real-world IT asset management system.

The project demonstrates:

- Backend API development (NestJS)
- Modern frontend (React)
- Role-based access control (RBAC)
- Docker-based local development
- Realistic business workflows

This project is actively evolving into a **DevOps-focused portfolio project**, with planned cloud deployment and infrastructure automation.

---

## 🛠 Tech Stack

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

### DevOps (Planned / In Progress)

- AWS (EC2 → ECS)
- Terraform (Infrastructure as Code)
- CI/CD (GitHub Actions)
- Monitoring (Prometheus + Grafana)

---

## 🔐 Core Features

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

- Asset statistics (total / assigned / available / maintenance)
- Category breakdown
- Recently added assets

---

### Asset History

- Audit log of asset changes
- Per-asset history tracking

---

### QR Code System

- Generate QR codes for assets
- Scan QR codes to open asset detail page

---

### Employee Assignment

- Assign assets to employees
- Track department and assignment date

---

## 🧱 Architecture (Current)

```text
Frontend (React)
        ↓
Backend API (NestJS)
        ↓
MongoDB
```

---

## ⚙️ Local Development (Docker)

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

## 🔑 Demo Users

| Role    | Username | Password   |
| ------- | -------- | ---------- |
| Admin   | admin    | secret123  |
| Manager | manager  | project123 |
| Viewer  | viewer   | viewer1234 |

---

## 🧪 Testing

- Tested with Thunder Client / Postman
- Verified:
  - Authentication (JWT)
  - Role-based access control
  - Endpoint protection

Expected responses:

- 200 / 201 → success
- 403 → forbidden
- 401 → unauthorized

---

## 📦 Project Structure

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
```

---

## 📈 Roadmap

### ✅ Completed (Full-stack)

- [x] Asset CRUD
- [x] Asset detail page
- [x] Dashboard
- [x] Search & filtering
- [x] Employee assignment
- [x] Asset history (audit log)
- [x] JWT authentication
- [x] Backend RBAC (RolesGuard)
- [x] Protected frontend routes
- [x] QR code generation
- [x] QR scanner
- [x] Admin asset page
- [x] Dockerized setup

---

### 🚧 DevOps Roadmap (Next Phase)

- [ ] Deploy backend to AWS EC2
- [ ] Deploy full stack with Docker on EC2
- [ ] Configure Nginx reverse proxy
- [ ] Add domain + HTTPS
- [ ] Introduce Terraform (infrastructure as code)
- [ ] Migrate to ECS (Fargate)
- [ ] Add CI/CD pipeline (GitHub Actions)
- [ ] Add monitoring (Prometheus + Grafana)

---

## 🎯 Purpose

This project was built to:

- Practice full-stack development
- Implement backend security (RBAC)
- Work with Docker environments
- Transition into DevOps engineering

---

## 🚀 DevOps Direction

This project is being extended into a **DevOps-focused system**, including:

- Cloud deployment (AWS)
- Infrastructure automation (Terraform)
- Container orchestration (ECS)
- Monitoring and observability

---

## 📄 License

This project is for demonstration and educational purposes.
