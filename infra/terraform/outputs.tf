output "project_name" {
  description = "Project name used for naming and tagging AWS resources."
  value       = var.project_name
}

output "environment" {
  description = "Environment name used for this Terraform deployment."
  value       = var.environment
}

output "aws_region" {
  description = "AWS region used by Terraform."
  value       = var.aws_region
}

output "name_prefix" {
  description = "Common name prefix used for AWS resources."
  value       = local.name_prefix
}

output "common_tags" {
  description = "Common tags applied to AWS resources."
  value       = local.common_tags
}

output "vpc_id" {
  description = "ID of the main VPC."
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the main VPC."
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets."
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets."
  value       = aws_subnet.private[*].id
}

output "availability_zones" {
  description = "Availability Zones used by the public and private subnets."
  value       = slice(data.aws_availability_zones.available.names, 0, length(var.public_subnet_cidrs))
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway attached to the VPC."
  value       = aws_internet_gateway.main.id
}

output "nat_gateway_id" {
  description = "ID of the NAT Gateway used for private subnet outbound internet access."
  value       = aws_nat_gateway.main.id
}

output "nat_gateway_public_ip" {
  description = "Public IP address allocated to the NAT Gateway."
  value       = aws_eip.nat.public_ip
}

output "public_route_table_id" {
  description = "ID of the public route table."
  value       = aws_route_table.public.id
}

output "private_route_table_id" {
  description = "ID of the private route table."
  value       = aws_route_table.private.id
}