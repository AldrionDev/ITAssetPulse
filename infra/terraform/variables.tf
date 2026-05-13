variable "project_name" {
  description = "Project name used for naming AWS resources"
  type        = string
  default     = "itassetpulse"
}

variable "environment" {
  description = "Demo environment name"
  type        = string
  default     = "demo"
}

variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "eu-north-1"
}

variable "vpc_cidr" {
  description = "cidr block for the main vpc"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "cidr blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "cidr blocks for private subnets"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

variable "image_tag" {
  description = "Docker image tag used for ECR image URI outputs"
  type        = string
  default     = "latest"
}

variable "eks_cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.34"
}

variable "eks_node_instance_types" {
  description = "EC2 instance types for the EKS managed node group."
  type        = list(string)
  default     = ["t3.small"]
}

variable "eks_node_desired_size" {
  description = "Desired number of worker nodes in the EKS managed node group."
  type        = number
  default     = 1
}

variable "eks_node_min_size" {
  description = "Minimum number of worker nodes in the EKS managed node group."
  type        = number
  default     = 1
}

variable "eks_node_max_size" {
  description = "Maximum number of worker nodes in the EKS managed node group."
  type        = number
  default     = 2
}

variable "kubernetes_namespace" {
  description = "Kubernetes namespace for the ITAssetPulse application."
  type        = string
  default     = "itassetpulse"
}

variable "mongodb_uri" {
  description = "MongoDB connection string used bz the backend application"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT secret used bz the backend application"
  type        = string
  sensitive   = true
}

