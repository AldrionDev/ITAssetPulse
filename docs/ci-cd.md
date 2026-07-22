# CI/CD with GitHub Actions

This document explains the CI/CD workflow used by the ITAssetPulse demo project.

The goal of this setup is to keep the deployment process simple, understandable, and suitable for a portfolio project.

---

## Current CI/CD scope

GitHub Actions is used for:

- Backend lint, unit tests and build validation
- Frontend lint and build validation
- Docker image build
- Docker image push to Amazon ECR
- Restarting existing Kubernetes deployments in EKS
- Waiting for Kubernetes rollout completion

GitHub Actions is not used for:

- Running `terraform apply`
- Creating or changing infrastructure
- Managing MongoDB Atlas resources
- GitOps
- ArgoCD
- Helm deployments
- Blue/green deployments
- Canary deployments
- Multiple environments

Infrastructure is managed separately with Terraform from the local development environment.

---

## Workflow files

The project uses two GitHub Actions workflow files:

```text
.github/workflows/ci.yml
.github/workflows/deploy.yml
````

---

## CI workflow

File:

```text
.github/workflows/ci.yml
```

Purpose:

The CI workflow validates that both the backend and frontend are lint-clean, that the backend unit tests pass, and that both build successfully.

It runs on:

* Pull requests
* Pushes to the main branch
* Calls from the deploy workflow, which uses it as its gate

Main steps, in two parallel jobs:

```text
Backend checks               Frontend checks
Checkout repository          Checkout repository
Setup Node.js                Setup Node.js
npm ci                       npm ci
npm run lint:check           npm run lint
npm test                     npm run build
npm run build
```

Dependencies are installed with `npm ci` rather than `npm install`, so the workflow uses exactly the versions in `package-lock.json`.

The backend uses a separate `lint:check` script because `npm run lint` runs ESLint with `--fix`, which would rewrite files and report success instead of failing.

The CI workflow does not connect to AWS and does not deploy the application.

---

## Deploy workflow

File:

```text
.github/workflows/deploy.yml
```

Purpose:

The deploy workflow builds Docker images, pushes them to Amazon ECR, and restarts the existing Kubernetes deployments in EKS.

It first runs the CI workflow and stops if anything fails, so nothing reaches ECR or the cluster unless lint, the unit tests and both builds pass:

```yaml
jobs:
  ci:
    uses: ./.github/workflows/ci.yml

  build-and-push-images:
    needs: ci
```

Overlapping deploys are queued rather than run in parallel, through a `concurrency` group. A run already in progress is never cancelled, because it may be halfway through a rollout.

Main steps:

```text
Run the CI workflow (gate)
Checkout repository
Configure AWS credentials
Login to Amazon ECR
Build backend Docker image
Push backend Docker image to ECR
Build frontend Docker image
Push frontend Docker image to ECR
Update kubeconfig for EKS
Restart backend deployment
Restart frontend deployment
Wait for backend rollout
Wait for frontend rollout
Show running pods
```

The deploy workflow uses the `latest` Docker image tag.

This is simple and matches the current Terraform-managed Kubernetes deployment setup.

---

## Required GitHub repository secrets

The following secrets must be configured in GitHub:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
AWS_ACCOUNT_ID
BACKEND_ECR_REPOSITORY
FRONTEND_ECR_REPOSITORY
```

Example non-sensitive values:

```text
AWS_REGION=eu-north-1
AWS_ACCOUNT_ID=554422868760
BACKEND_ECR_REPOSITORY=itassetpulse-demo-backend-ecr
FRONTEND_ECR_REPOSITORY=itassetpulse-demo-frontend-ecr
```

Sensitive values:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

These must never be committed to the repository.

They must only be stored as GitHub repository secrets.

---

## AWS IAM user used by GitHub Actions

The deployment uses a dedicated IAM user:

```text
github-actions-itassetpulse
```

This user is used by GitHub Actions to:

* Authenticate to AWS
* Push Docker images to ECR
* Connect to the EKS cluster
* Restart Kubernetes deployments

For this demo milestone, GitHub repository secrets are used for AWS authentication.

A more secure future improvement would be to replace long-lived AWS access keys with GitHub OIDC and an AWS IAM role.

---

## Required AWS permissions

The GitHub Actions IAM user needs ECR permissions for pushing Docker images.

Required ECR actions include:

```text
ecr:GetAuthorizationToken
ecr:BatchCheckLayerAvailability
ecr:CompleteLayerUpload
ecr:DescribeImages
ecr:DescribeRepositories
ecr:InitiateLayerUpload
ecr:PutImage
ecr:UploadLayerPart
```

The user also needs permission to describe the EKS cluster:

```text
eks:DescribeCluster
```

This is required for:

```bash
aws eks update-kubeconfig
```

---

## EKS access

The EKS cluster authentication mode was updated from:

```text
CONFIG_MAP
```

to:

```text
API_AND_CONFIG_MAP
```

This allows the project to use EKS access entries while still keeping the existing ConfigMap-based access mode.

The GitHub Actions IAM user has an EKS access entry:

```text
arn:aws:iam::554422868760:user/github-actions-itassetpulse
```

For this demo setup, it is associated with:

```text
AmazonEKSClusterAdminPolicy
```

Scope:

```text
cluster
```

This is simple and works for the demo project.

In a production setup, this should be reduced to narrower namespace-level permissions.

---

## Docker image tagging

The current image tag is:

```text
latest
```

This is simple and matches the current Terraform-managed Kubernetes deployment.

Current image format:

```text
554422868760.dkr.ecr.eu-north-1.amazonaws.com/itassetpulse-demo-backend-ecr:latest
554422868760.dkr.ecr.eu-north-1.amazonaws.com/itassetpulse-demo-frontend-ecr:latest
```

Limitation:

Using `latest` makes it harder to identify exactly which commit is running in the cluster.

Future improvement:

Use Git commit SHA tags, for example:

```text
backend:<commit-sha>
frontend:<commit-sha>
```

---

## EKS deployment strategy

The deployment strategy is intentionally simple.

After new images are pushed to ECR, GitHub Actions restarts the Kubernetes deployments:

```bash
kubectl rollout restart deployment/itassetpulse-backend -n itassetpulse
kubectl rollout restart deployment/itassetpulse-frontend -n itassetpulse
```

Then it waits for rollout completion:

```bash
kubectl rollout status deployment/itassetpulse-backend -n itassetpulse
kubectl rollout status deployment/itassetpulse-frontend -n itassetpulse
```

This causes Kubernetes to create new pods that pull the latest images from ECR.

---

## Manual deployment fallback

If GitHub Actions is unavailable, the deployment can still be done manually.

Login to ECR:

```bash
aws ecr get-login-password --region eu-north-1 | docker login --username AWS --password-stdin 554422868760.dkr.ecr.eu-north-1.amazonaws.com
```

Build images:

```bash
docker build -t itassetpulse-backend ./backend
docker build -t itassetpulse-frontend ./frontend
```

Tag images:

```bash
docker tag itassetpulse-backend:latest 554422868760.dkr.ecr.eu-north-1.amazonaws.com/itassetpulse-demo-backend-ecr:latest
docker tag itassetpulse-frontend:latest 554422868760.dkr.ecr.eu-north-1.amazonaws.com/itassetpulse-demo-frontend-ecr:latest
```

Push images:

```bash
docker push 554422868760.dkr.ecr.eu-north-1.amazonaws.com/itassetpulse-demo-backend-ecr:latest
docker push 554422868760.dkr.ecr.eu-north-1.amazonaws.com/itassetpulse-demo-frontend-ecr:latest
```

Update kubeconfig:

```bash
aws eks update-kubeconfig \
  --region eu-north-1 \
  --name itassetpulse-demo-eks
```

Restart deployments:

```bash
kubectl rollout restart deployment/itassetpulse-backend -n itassetpulse
kubectl rollout restart deployment/itassetpulse-frontend -n itassetpulse
```

Verify rollout:

```bash
kubectl rollout status deployment/itassetpulse-backend -n itassetpulse
kubectl rollout status deployment/itassetpulse-frontend -n itassetpulse
```

---

## Verification commands

Check ECR images:

```bash
aws ecr describe-images \
  --repository-name itassetpulse-demo-backend-ecr \
  --region eu-north-1
```

```bash
aws ecr describe-images \
  --repository-name itassetpulse-demo-frontend-ecr \
  --region eu-north-1
```

Check EKS cluster:

```bash
aws eks describe-cluster \
  --name itassetpulse-demo-eks \
  --region eu-north-1 \
  --query "cluster.status"
```

Check Kubernetes resources:

```bash
kubectl get pods -n itassetpulse
kubectl get deployments -n itassetpulse
kubectl get services -n itassetpulse
kubectl get ingress -n itassetpulse
```

Check rollout status:

```bash
kubectl rollout status deployment/itassetpulse-backend -n itassetpulse
kubectl rollout status deployment/itassetpulse-frontend -n itassetpulse
```

---

## Rollback and restart notes

The current deployment uses the `latest` tag.

Because of this, rollback is limited.

Useful restart command:

```bash
kubectl rollout restart deployment/itassetpulse-backend -n itassetpulse
kubectl rollout restart deployment/itassetpulse-frontend -n itassetpulse
```

Check rollout history:

```bash
kubectl rollout history deployment/itassetpulse-backend -n itassetpulse
kubectl rollout history deployment/itassetpulse-frontend -n itassetpulse
```

Rollback to previous ReplicaSet if available:

```bash
kubectl rollout undo deployment/itassetpulse-backend -n itassetpulse
kubectl rollout undo deployment/itassetpulse-frontend -n itassetpulse
```

Note:

A better rollback strategy would use immutable image tags such as Git commit SHA tags.

---

## Troubleshooting

### GitHub Actions cannot authenticate to AWS

Check these GitHub repository secrets:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
```

Also check that the IAM user exists:

```text
github-actions-itassetpulse
```

---

### ECR login fails

Check that the IAM user has:

```text
ecr:GetAuthorizationToken
```

Also verify the AWS region:

```text
eu-north-1
```

---

### Docker push fails

Check that the IAM user has push permissions for both ECR repositories:

```text
itassetpulse-demo-backend-ecr
itassetpulse-demo-frontend-ecr
```

Also check the repository secrets:

```text
AWS_ACCOUNT_ID
BACKEND_ECR_REPOSITORY
FRONTEND_ECR_REPOSITORY
```

---

### kubectl says "You must be logged in to the server"

This means AWS authentication may work, but Kubernetes/EKS access is missing.

Check EKS access entries:

```bash
aws eks list-access-entries \
  --cluster-name itassetpulse-demo-eks \
  --region eu-north-1
```

Check associated policies:

```bash
aws eks list-associated-access-policies \
  --cluster-name itassetpulse-demo-eks \
  --region eu-north-1 \
  --principal-arn arn:aws:iam::554422868760:user/github-actions-itassetpulse
```

The GitHub Actions IAM user should have an associated EKS access policy.

---

### Rollout fails

Check pods:

```bash
kubectl get pods -n itassetpulse
```

Check backend logs:

```bash
kubectl logs deployment/itassetpulse-backend -n itassetpulse
```

Check frontend logs:

```bash
kubectl logs deployment/itassetpulse-frontend -n itassetpulse
```

Check deployment details:

```bash
kubectl describe deployment/itassetpulse-backend -n itassetpulse
kubectl describe deployment/itassetpulse-frontend -n itassetpulse
```

Common causes:

* Image was not pushed to ECR
* Wrong image tag
* Pod cannot pull image
* Backend cannot connect to MongoDB Atlas
* MongoDB Atlas access list does not allow the NAT Gateway public IP
* Kubernetes secret is missing or incorrect

---

## Cost notes

The CI/CD deployment only works while the AWS infrastructure exists.

Cost-related resources include:

* EKS cluster
* EC2 worker node
* NAT Gateway
* Application Load Balancer
* ECR storage
* MongoDB Atlas paid tier, if used
* GitHub Actions minutes, depending on GitHub plan

After testing, the AWS infrastructure can be destroyed to avoid ongoing costs.

Important:

After `terraform destroy`, ECR repositories may be deleted and recreated empty.

If this happens, Docker images must be pushed again before the EKS deployment can run successfully.

---

## Future improvements

Possible future improvements:

* Use GitHub OIDC instead of long-lived AWS access keys
* Use Git commit SHA image tags
* Add image tag outputs to deployment logs
* Add namespace-scoped Kubernetes permissions instead of cluster admin access
* Add frontend component tests, which the CI workflow does not run yet
* Add a monitoring/observability milestone