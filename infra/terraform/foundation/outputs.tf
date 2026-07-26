output "vpc_id" {
  description = "ID of the VPC."
  value       = module.network.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets, in the same order as the public_subnet_cidrs input."
  value       = module.network.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets, in the same order as the private_subnet_cidrs input."
  value       = module.network.private_subnet_ids
}

output "backend_ecr_repository_url" {
  description = "URL of the backend ECR repository."
  value       = module.ecr_backend.repository_url
}

output "backend_ecr_repository_arn" {
  description = "ARN of the backend ECR repository."
  value       = module.ecr_backend.repository_arn
}

output "frontend_ecr_repository_url" {
  description = "URL of the frontend ECR repository."
  value       = module.ecr_frontend.repository_url
}

output "frontend_ecr_repository_arn" {
  description = "ARN of the frontend ECR repository."
  value       = module.ecr_frontend.repository_arn
}
