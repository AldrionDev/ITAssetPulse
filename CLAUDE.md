# CLAUDE.md

## Repository structure

This repository contains two independent Node.js packages and infrastructure code. There is no root `package.json` or workspace configuration. Run npm commands from the relevant package directory.

- `backend/` — NestJS, TypeScript, Mongoose, MongoDB
- `frontend/` — React, TypeScript, Vite, Tailwind CSS
- `infra/terraform/` — AWS, ECS Fargate, ECR, ALB, networking, and MongoDB Atlas infrastructure

## Commands

### Backend

Run from `backend/`:

```bash
npm run build
npm run start:dev
npm run lint
npm run format
npm test
npm run test:e2e
```

`npm run lint` uses `--fix` and may modify files.

`npm run seed` executes `dist/seed.js`, so run `npm run build` first.

### Frontend

Run from `frontend/`:

```bash
npm run dev
npm run build
npm run lint
```

The frontend currently has no automated test setup.

### Local stack

Run from the repository root:

```bash
docker compose build
docker compose up -d
docker exec -it asset-backend npm run seed
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

## Known limitations

- The backend port is hardcoded to `3000` in `backend/src/main.ts`.
- Backend `npm test` currently has no meaningful coverage because there are no test specifications. Add tests for new or changed backend behavior.

## Working rules

- Communicate explanations and progress updates in Hungarian.
- Write code, identifiers, comments, commit messages, issue titles, and PR descriptions in English.
- Inspect relevant files and present a small plan before editing.
- Wait for approval unless explicitly instructed to implement immediately.
- Focus only on the current task and avoid unrelated redesigns.
- Keep backend, frontend, and infrastructure changes separate unless the task requires otherwise.
- Prefer simple, readable solutions that follow existing project patterns.

## Infrastructure safety

The previous Terraform remote-state S3 bucket was deleted. Do not assume that the available Terraform state matches the actual AWS resources.

- Do not run `terraform apply`, `terraform destroy`, `terraform import`, or state-changing AWS and Kubernetes commands without explicit approval.
- Do not rely on `terraform plan` until the backend configuration, state, and existing AWS resources have been verified.
- Never commit secrets, `.env`, `.tfvars`, `backend.hcl`, Terraform state, or generated credentials.
