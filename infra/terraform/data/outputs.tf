output "mongodb_secret_arn" {
  description = "ARN of the Secrets Manager secret holding the MONGO_URI connection string. Never the secret value."
  value       = aws_secretsmanager_secret.mongo_uri.arn
}
