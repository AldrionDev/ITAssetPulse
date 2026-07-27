output "ecs_cluster_name" {
  description = "Name of the ECS cluster."
  value       = aws_ecs_cluster.this.name
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer."
  value       = aws_lb.this.dns_name
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer."
  value       = aws_lb.this.arn
}

output "frontend_service_name" {
  description = "Name of the frontend ECS service."
  value       = module.frontend.service_name
}

output "backend_service_name" {
  description = "Name of the backend ECS service."
  value       = module.backend.service_name
}

output "frontend_target_group_arn" {
  description = "ARN of the frontend ALB target group."
  value       = aws_lb_target_group.frontend.arn
}

output "backend_target_group_arn" {
  description = "ARN of the backend ALB target group."
  value       = aws_lb_target_group.backend.arn
}

output "jwt_secret_arn" {
  description = "ARN of the Secrets Manager secret holding JWT_SECRET. Never the secret value."
  value       = aws_secretsmanager_secret.jwt.arn
}
