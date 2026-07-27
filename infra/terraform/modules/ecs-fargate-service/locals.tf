locals {
  name_prefix = "${var.project_name}-${var.environment}-${var.name}"

  common_tags = merge(var.common_tags, {
    Project     = var.project_name
    Environment = var.environment
    Service     = var.name
    ManagedBy   = "terraform"
    Purpose     = "ecs-fargate-service"
  })

  # Full documented Linux/X86_64 Fargate CPU (vCPU units) -> memory (MiB) option table.
  fargate_cpu_memory_options = {
    "256"   = [512, 1024, 2048]
    "512"   = [1024, 2048, 3072, 4096]
    "1024"  = range(2048, 8193, 1024)
    "2048"  = range(4096, 16385, 1024)
    "4096"  = range(8192, 30721, 1024)
    "8192"  = range(16384, 61441, 4096)
    "16384" = range(32768, 122881, 8192)
    "32768" = [61440, 122880, 249856]
  }

  # CPU sizes 8192 and 16384 require at least Linux platform version 1.4.0.
  ecs_platform_version = "1.4.0"

  environment_variables_list = [
    for k in sort(keys(var.environment_variables)) : {
      name  = k
      value = var.environment_variables[k]
    }
  ]

  secrets_list = [
    for k in sort(keys(var.secrets)) : {
      name      = k
      valueFrom = var.secrets[k]
    }
  ]
}
