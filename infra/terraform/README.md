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
- EKS cluster
- EKS managed node group
- Terraform outputs for networking, ECR, and EKS resources
- EKS cluster
- EKS managed node group
- EKS IAM roles for the cluster and worker nodes

Not included yet:

- EC2 application deployment
- ECS service
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
- EKS cluster
- EKS managed node group

---

## ECR Image Workflow

This Terraform configuration creates private AWS ECR repositories for the ITAssetPulse Docker images.

Created ECR repositories:

- Backend: `itassetpulse-demo-backend-ecr`
- Frontend: `itassetpulse-demo-frontend-ecr`

These repositories are used to store Docker images before deploying the application to AWS services such as Kubernetes workloads on EKS.

The ECR milestone only creates the image registry layer. It does not deploy the application to AWS.

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

## EKS and kubectl access

This Terraform configuration creates an Amazon EKS cluster and a managed node group for the ITAssetPulse demo environment.

Created EKS resources:

- EKS cluster: `itassetpulse-demo-eks`
- EKS managed node group: `itassetpulse-demo-node-group`
- Worker nodes are placed in private subnets
- EKS cluster IAM role is managed by Terraform
- EKS node group IAM role is managed by Terraform

This milestone only creates the Kubernetes cluster layer. It does not deploy the application yet.

---

## EKS cost note

EKS can create AWS costs even when no application is deployed.

Cost-related resources include:

- EKS control plane
- NAT Gateway
- EC2 worker node in the managed node group
- Data transfer, depending on usage

This project uses a small demo setup:

```text
EKS node instance type: t3.small
Desired node count: 1
Minimum node count: 1
Maximum node count: 2
```

After testing, decide whether to keep the cluster running or destroy it to avoid ongoing costs.

---

## EKS prerequisites

Before accessing the cluster with kubectl, make sure:

- AWS CLI is installed and configured
- kubectl is installed
- Terraform has been applied successfully
- The EKS cluster exists
- The EKS node group is active
- You are using the correct AWS account
- You are using the correct AWS region: `eu-north-1`

Verify your AWS identity:

```bash
aws sts get-caller-identity
```

Expected AWS account:

```text
554422868760
```

---

## Get EKS values from Terraform

From the Terraform folder:

```bash
cd infra/terraform

terraform output eks_cluster_name
terraform output eks_node_group_name
terraform output eks_cluster_endpoint
```

Expected cluster name:

```text
"itassetpulse-demo-eks"
```

Expected node group name:

```text
"itassetpulse-demo-node-group"
```

Useful EKS outputs:

```bash
terraform output eks_cluster_name
terraform output eks_cluster_endpoint
terraform output eks_cluster_security_group_id
terraform output eks_cluster_arn
terraform output eks_cluster_version
terraform output eks_node_group_name
terraform output eks_node_group_arn
terraform output eks_node_group_role_arn
terraform output eks_node_instance_types
```

---

## Verify the EKS cluster

Check that the EKS cluster is active:

```bash
aws eks describe-cluster \
  --name itassetpulse-demo-eks \
  --region eu-north-1 \
  --query "cluster.status"
```

Expected output:

```text
"ACTIVE"
```

---

## Verify the EKS managed node group

Check that the managed node group is active:

```bash
aws eks describe-nodegroup \
  --cluster-name itassetpulse-demo-eks \
  --nodegroup-name itassetpulse-demo-node-group \
  --region eu-north-1 \
  --query "nodegroup.status"
```

Expected output:

```text
"ACTIVE"
```

Verify that the node group uses private subnets:

```bash
aws eks describe-nodegroup \
  --cluster-name itassetpulse-demo-eks \
  --nodegroup-name itassetpulse-demo-node-group \
  --region eu-north-1 \
  --query "nodegroup.subnets"
```

Expected subnet IDs should match the Terraform private subnet output:

```bash
terraform output private_subnet_ids
```

---

## Update local kubeconfig

Run:

```bash
aws eks update-kubeconfig \
  --region eu-north-1 \
  --name itassetpulse-demo-eks
```

Expected output:

```text
Updated context arn:aws:eks:eu-north-1:554422868760:cluster/itassetpulse-demo-eks in ~/.kube/config
```

This command updates your local kubeconfig file so kubectl can connect to the EKS cluster.

It does not create or change AWS infrastructure.

---

## Test kubectl access

Check the current kubectl context:

```bash
kubectl config current-context
```

Expected result should reference:

```text
arn:aws:eks:eu-north-1:554422868760:cluster/itassetpulse-demo-eks
```

Check worker nodes:

```bash
kubectl get nodes
```

Expected result:

```text
NAME                                      STATUS   ROLES    AGE   VERSION
ip-10-0-x-x.eu-north-1.compute.internal   Ready    <none>   ...   v1.34...
```

The important part is:

```text
STATUS = Ready
```

Check all pods:

```bash
kubectl get pods -A
```

You should see Kubernetes system pods, for example:

```text
kube-system   aws-node-...
kube-system   coredns-...
kube-system   kube-proxy-...
```

Useful kubectl commands:

```bash
kubectl cluster-info
kubectl get nodes
kubectl get nodes -o wide
kubectl get pods -A
kubectl get namespaces
kubectl get svc
```

---

## EKS troubleshooting

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

### Wrong AWS account

Check:

```bash
aws sts get-caller-identity
```

The account should be:

```text
554422868760
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

when using AWS CLI EKS commands.

---

### kubectl is not installed

Check:

```bash
kubectl version --client
```

If the command is not found, install kubectl first.

---

### kubeconfig is not updated

Run:

```bash
aws eks update-kubeconfig \
  --region eu-north-1 \
  --name itassetpulse-demo-eks
```

Then check:

```bash
kubectl config current-context
```

---

### Unauthorized or access denied

First check which AWS identity is active:

```bash
aws sts get-caller-identity
```

Then update kubeconfig again:

```bash
aws eks update-kubeconfig \
  --region eu-north-1 \
  --name itassetpulse-demo-eks
```

If the cluster was created with a different IAM user or role, use that same identity or configure EKS access for the current identity.

---

### Nodes are not ready

Check the node group status:

```bash
aws eks describe-nodegroup \
  --cluster-name itassetpulse-demo-eks \
  --nodegroup-name itassetpulse-demo-node-group \
  --region eu-north-1 \
  --query "nodegroup.status"
```

Check Kubernetes system pods:

```bash
kubectl get pods -n kube-system
```

If the node group was just created, wait a few minutes and check again.

---

### EKS creation takes time

Creating or updating EKS resources can take several minutes.

Check cluster status:

```bash
aws eks describe-cluster \
  --name itassetpulse-demo-eks \
  --region eu-north-1 \
  --query "cluster.status"
```

Check node group status:

```bash
aws eks describe-nodegroup \
  --cluster-name itassetpulse-demo-eks \
  --nodegroup-name itassetpulse-demo-node-group \
  --region eu-north-1 \
  --query "nodegroup.status"
```

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
