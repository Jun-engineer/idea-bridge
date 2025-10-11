variable "project_name" {
  description = "Project slug for tagging and resource names."
  type        = string
  default     = "idea-bridge"
}

variable "environment" {
  description = "Environment name (e.g., dev, prod)."
  type        = string
  default     = "prod"
}

variable "state_bucket_name" {
  description = "Optional explicit name for the Terraform state bucket. Leave blank to auto-generate."
  type        = string
  default     = ""
}

variable "lock_table_name" {
  description = "Optional explicit name for the Terraform lock table. Leave blank to auto-generate."
  type        = string
  default     = ""
}
