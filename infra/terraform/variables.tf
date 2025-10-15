variable "aws_account_id" {
  description = "AWS account ID to deploy into."
  type        = string
  default     = "085141726968"

  validation {
    condition     = length(var.aws_account_id) == 12 && can(tonumber(var.aws_account_id))
    error_message = "aws_account_id must be a 12-digit numeric string."
  }
}

variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "Logical name used as a prefix for resources."
  type        = string
  default     = "idea-bridge"
}

variable "environment" {
  description = "Deployment environment identifier (e.g., dev, staging, prod)."
  type        = string
  default     = "prod"
}

variable "github_org" {
  description = "GitHub organization or user that owns the repository."
  type        = string
  default     = "Jun-engineer"
}

variable "github_repo" {
  description = "GitHub repository name (without owner)."
  type        = string
  default     = "idea-bridge"
}

variable "github_oidc_thumbprint" {
  description = "Thumbprint for the GitHub Actions OIDC provider."
  type        = string
  default     = "6938fd4d98bab03faadb97b34396831e3780aea1"
}

variable "create_github_oidc_provider" {
  description = "Whether to create the GitHub Actions OIDC provider in this stack (set to true if it doesn't already exist)."
  type        = bool
  default     = false
}

variable "cors_allowed_origin" {
  description = "Origin URL allowed by the backend CORS policy."
  type        = string
  default     = "https://example.com"
}

variable "jwt_secret" {
  description = "JWT secret used by the backend."
  type        = string
  sensitive   = true
}

variable "session_cookie_name" {
  description = "Name of the session cookie set by the backend."
  type        = string
  default     = "idea_bridge_session"
}

variable "access_token_ttl_seconds" {
  description = "Lifetime of JWT access tokens in seconds."
  type        = number
  default     = 60 * 60 * 12
}

variable "session_ttl_seconds" {
  description = "Lifetime of server-side sessions in seconds."
  type        = number
  default     = 60 * 60 * 12
}

variable "lambda_package_path" {
  description = "Relative path to the packaged backend Lambda zip file."
  type        = string
  default     = "../../backend/idea-bridge-backend.zip"
}

variable "aws_sns_sender_id" {
  description = "Optional SNS sender ID for SMS messages. Leave blank if not provisioned."
  type        = string
  default     = ""
}

variable "aws_sns_origination_number" {
  description = "Optional SNS origination phone number in E.164 format."
  type        = string
  default     = ""
}

variable "aws_sns_sms_type" {
  description = "SNS SMS message type (Transactional or Promotional)."
  type        = string
  default     = "Transactional"

  validation {
    condition     = contains(["Transactional", "Promotional"], var.aws_sns_sms_type)
    error_message = "aws_sns_sms_type must be either 'Transactional' or 'Promotional'."
  }
}

variable "aws_sns_monthly_spend_limit" {
  description = "Monthly SNS SMS spend limit in USD (must not exceed account allowance)."
  type        = string
  default     = "1"
}

variable "verification_code_ttl" {
  description = "Verification code TTL in seconds."
  type        = number
  default     = 600
}

variable "verification_resend_cooldown" {
  description = "Cooldown between verification code resend attempts (seconds)."
  type        = number
  default     = 60
}

variable "verification_max_attempts" {
  description = "Maximum allowed verification attempts per request."
  type        = number
  default     = 5
}

variable "phone_verification_enabled" {
  description = "Whether phone verification challenges are required (true) or disabled (false)."
  type        = bool
  default     = true
}
