# ITAssetPulse Terraform Infrastructure

This folder contains the Terraform configuration for the ITAssetPulse AWS infrastructure.

ITAssetPulse is a CV/demo project, so this Terraform setup is intentionally simple and focused on a single demo environment.

## Current scope

The current Terraform setup manages the AWS infrastructure foundation for the demo environment.

Currently included:

- Terraform remote state in S3
- VPC
- Public subnets
- Private subnets
- Internet Gateway
- NAT Gateway
- Route tables
- ECR repository for backend Docker image
- ECR repository for frontend Docker image
- ECR lifecycle policies
- Terraform outputs for networking and ECR resources

Not included yet:

- EC2 application deployment
- ECS service
- EKS cluster
- Kubernetes manifests
- Load balancer
- Managed database
- Monitoring resources
- CI/CD pipeline

This project uses Terraform for AWS infrastructure. AWS resources should not be created manually in the AWS Console unless explicitly documented as a bootstrap exception.

---

## Folder structure

```text
infra/
  terraform/
    backend.hcl.example
    backend.tf
    main.tf
    variables.tf
    outputs.tf
    providers.tf
    versions.tf
    terraform.tfvars.example
    README.md
    bootstrap/
      main.tf
      variables.tf
      outputs.tf
      providers.tf
      versions.tf
      terraform.tfvars.example
```

## Files

- `versions.tf` defines the required Terraform and AWS provider versions.
- `providers.tf` configures the AWS provider and default tags.
- `variables.tf` defines reusable input variables.
- `outputs.tf` exposes useful values such as VPC IDs, subnet IDs, and ECR image URIs.
- `main.tf` contains the AWS resources for the current demo infrastructure.
- `backend.tf` enables the Terraform remote state backend.
- `backend.hcl.example` shows how to configure the remote backend locally.
- `terraform.tfvars.example` shows example local variable values.
- `bootstrap/` contains the one-time Terraform configuration for creating the remote state S3 bucket.

The real `terraform.tfvars` and `backend.hcl` files are local only and must not be committed.

---

## Local setup

From the Terraform folder:

```bash
cd infra/terraform
```

Create local variable file:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Create local backend config file:

```bash
cp backend.hcl.example backend.hcl
```

Then update the local files if needed.

---

## Terraform commands

Format Terraform files:

```bash
terraform fmt
```

Initialize Terraform:

```bash
terraform init -backend-config=backend.hcl
```

Validate the configuration:

```bash
terraform validate
```

Preview changes:

```bash
terraform plan
```

Apply changes:

```bash
terraform apply
```

Show outputs:

```bash
terraform output
```

---

## Remote state backend

Terraform state is stored remotely in an S3 bucket.

The remote state bucket is created once with the bootstrap Terraform configuration:

```text
infra/terraform/bootstrap
```

The main Terraform configuration uses this S3 bucket as its backend.

Current backend configuration example:

```hcl
bucket       = "itassetpulse-demo-terraform-state-554422868760"
key          = "itassetpulse/demo/terraform.tfstate"
region       = "eu-north-1"
encrypt      = true
use_lockfile = true
```

The real `backend.hcl` file is local only and must not be committed.

---

## Bootstrap workflow

Run the bootstrap Terraform configuration first if the remote state bucket does not exist yet.

```bash
cd infra/terraform/bootstrap

cp terraform.tfvars.example terraform.tfvars

terraform fmt
terraform init
terraform validate
terraform plan
terraform apply
```

This creates:

- S3 bucket for Terraform remote state
- Bucket versioning
- Server-side encryption
- Public access block

Verify remote state bucket content:

```bash
aws s3 ls s3://itassetpulse-demo-terraform-state-554422868760/itassetpulse/demo/
```

Verify bucket versioning:

```bash
aws s3api get-bucket-versioning \
  --bucket itassetpulse-demo-terraform-state-554422868760
```

Verify public access block:

```bash
aws s3api get-public-access-block \
  --bucket itassetpulse-demo-terraform-state-554422868760
```

---

## Main infrastructure workflow

After the bootstrap step is complete, use the main Terraform configuration.

```bash
cd infra/terraform

terraform fmt
terraform init -backend-config=backend.hcl
terraform validate
terraform plan
terraform apply
terraform output
```

The main Terraform configuration currently creates:

- VPC
- Public subnets
- Private subnets
- Internet Gateway
- NAT Gateway
- Route tables
- ECR repositories
- ECR lifecycle policies

---

## ECR Image Workflow

This Terraform configuration creates private AWS ECR repositories for the ITAssetPulse Docker images.

Created ECR repositories:

- Backend: `itassetpulse-demo-backend-ecr`
- Frontend: `itassetpulse-demo-frontend-ecr`

These repositories are used to store Docker images before deploying the application to AWS services such as ECS or EKS in later milestones.

This milestone only creates the image registry layer. It does not deploy the application to AWS yet.

---

## ECR prerequisites

Before using this workflow, make sure:

- AWS CLI is installed and configured
- Docker is installed and running
- Terraform has already been applied
- The ECR repositories exist in AWS
- You are using the correct AWS region: `eu-north-1`

Verify your AWS identity:

```bash
aws sts get-caller-identity
```

Verify that the ECR repositories exist:

```bash
aws ecr describe-repositories --region eu-north-1
```

---

## Get ECR repository URLs from Terraform

From the Terraform folder:

```bash
cd infra/terraform

terraform output backend_ecr_repository_url
terraform output frontend_ecr_repository_url
```

Expected output format:

```text
554422868760.dkr.ecr.eu-north-1.amazonaws.com/itassetpulse-demo-backend-ecr
554422868760.dkr.ecr.eu-north-1.amazonaws.com/itassetpulse-demo-frontend-ecr
```

You can also get the full image URIs including the image tag:

```bash
terraform output backend_image_uri
terraform output frontend_image_uri
```

Expected output format:

```text
554422868760.dkr.ecr.eu-north-1.amazonaws.com/itassetpulse-demo-backend-ecr:latest
554422868760.dkr.ecr.eu-north-1.amazonaws.com/itassetpulse-demo-frontend-ecr:latest
```

---

## Login to AWS ECR

Docker must be logged in to AWS ECR before pushing images.

Run:

```bash
aws ecr get-login-password --region eu-north-1 | docker login --username AWS --password-stdin 554422868760.dkr.ecr.eu-north-1.amazonaws.com
```

Expected result:

```text
Login Succeeded
```

---

## Build Docker images

Run these commands from the project root:

```bash
docker build -t itassetpulse-backend ./backend
docker build -t itassetpulse-frontend ./frontend
```

This creates local Docker images:

```text
itassetpulse-backend:latest
itassetpulse-frontend:latest
```

---

## Tag Docker images for ECR

Docker needs the image name to match the ECR repository URL before pushing.

From the project root:

```bash
docker tag itassetpulse-backend:latest 554422868760.dkr.ecr.eu-north-1.amazonaws.com/itassetpulse-demo-backend-ecr:latest
```

```bash
docker tag itassetpulse-frontend:latest 554422868760.dkr.ecr.eu-north-1.amazonaws.com/itassetpulse-demo-frontend-ecr:latest
```

After tagging, the same local image has an additional ECR-compatible name.

---

## Push Docker images to ECR

Push the backend image:

```bash
docker push 554422868760.dkr.ecr.eu-north-1.amazonaws.com/itassetpulse-demo-backend-ecr:latest
```

Push the frontend image:

```bash
docker push 554422868760.dkr.ecr.eu-north-1.amazonaws.com/itassetpulse-demo-frontend-ecr:latest
```

---

## Verify pushed images

Verify the backend image:

```bash
aws ecr describe-images \
  --repository-name itassetpulse-demo-backend-ecr \
  --region eu-north-1
```

Verify the frontend image:

```bash
aws ecr describe-images \
  --repository-name itassetpulse-demo-frontend-ecr \
  --region eu-north-1
```

If the push was successful, AWS returns image details such as:

- image digest
- image tags
- image size
- push timestamp

---

## Useful Terraform outputs

The most useful outputs for later deployment milestones are:

```bash
terraform output backend_image_uri
terraform output frontend_image_uri
```

Example:

```text
554422868760.dkr.ecr.eu-north-1.amazonaws.com/itassetpulse-demo-backend-ecr:latest
554422868760.dkr.ecr.eu-north-1.amazonaws.com/itassetpulse-demo-frontend-ecr:latest
```

These values can later be used in Kubernetes, ECS, or CI/CD deployment configuration.

Example Kubernetes image reference:

```yaml
image: 554422868760.dkr.ecr.eu-north-1.amazonaws.com/itassetpulse-demo-backend-ecr:latest
```

---

## Image tags

The current default image tag is:

```text
latest
```

This is simple and acceptable for this demo milestone.

Later, a CI/CD pipeline can use better tags, for example:

```text
v1.0.0
demo
git-commit-sha
```

Using unique tags makes deployments easier to track and roll back.

---

## Troubleshooting

### AWS CLI is not configured

Check your AWS identity:

```bash
aws sts get-caller-identity
```

If this fails, configure AWS CLI:

```bash
aws configure
```

---

### Docker daemon is not running

Check Docker:

```bash
docker ps
```

If Docker is not running, start Docker Desktop or your Docker service.

---

### ECR login expired

ECR login tokens expire. Run the login command again:

```bash
aws ecr get-login-password --region eu-north-1 | docker login --username AWS --password-stdin 554422868760.dkr.ecr.eu-north-1.amazonaws.com
```

---

### Access denied

Possible causes:

- Wrong AWS profile
- Missing ECR permissions
- Wrong AWS account
- Wrong AWS region

Check:

```bash
aws sts get-caller-identity
```

Confirm that the account ID matches:

```text
554422868760
```

---

### Repository not found

Check that the repositories exist:

```bash
aws ecr describe-repositories --region eu-north-1
```

Also verify the repository names:

```text
itassetpulse-demo-backend-ecr
itassetpulse-demo-frontend-ecr
```

---

### Wrong AWS region

This project currently uses:

```text
eu-north-1
```

Always include:

```bash
--region eu-north-1
```

when using AWS CLI commands.

---

### Image tag mismatch

If you push:

```text
:latest
```

but later try to deploy:

```text
:v1.0.0
```

the image will not be found.

Check available image tags with:

```bash
aws ecr describe-images \
  --repository-name itassetpulse-demo-backend-ecr \
  --region eu-north-1
```

---

## Git safety notes

Do not commit local Terraform state or local variable files.

Do not commit:

```text
.terraform/
terraform.tfstate
terraform.tfstate.backup
terraform.tfvars
backend.hcl
```

Commit these files:

```text
backend.hcl.example
terraform.tfvars.example
main.tf
variables.tf
outputs.tf
providers.tf
versions.tf
README.md
```