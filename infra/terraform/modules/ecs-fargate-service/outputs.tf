output "service_name" {
  description = "Name of the ECS service."
  value       = aws_ecs_service.this.name
}

output "security_group_id" {
  description = "ID of the service's security group."
  value       = aws_security_group.this.id
}

output "log_group_name" {
  description = "Name of the CloudWatch log group."
  value       = aws_cloudwatch_log_group.this.name
}

output "task_definition_arn" {
  description = "ARN of the ECS task definition."
  value       = aws_ecs_task_definition.this.arn
}

output "execution_role_arn" {
  description = "ARN of the task execution role."
  value       = aws_iam_role.execution.arn
}
