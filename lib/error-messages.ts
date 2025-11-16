export const ErrorMessages = {
  401: {
    title: "Authentication Required",
    message: "Please check your API key is valid and properly configured.",
    action: "Get your API key",
    actionUrl: "#"
  },
  402: {
    title: "Credits Exhausted",
    message: "You've run out of credits for this billing period.",
    action: "Upgrade your plan",
    actionUrl: "#"
  },
  429: {
    title: "Rate Limit Reached",
    message: "Too many requests. Please wait a moment before trying again.",
    action: "Learn about rate limits",
    actionUrl: "#"
  },
  500: {
    title: "Something went wrong",
    message: "We encountered an unexpected error. Please try again.",
    action: "Contact support",
    actionUrl: "#"
  },
  504: {
    title: "Request Timeout",
    message: "This request is taking longer than expected. Please try again.",
    action: "Optimize your request",
    actionUrl: "#"
  }
} as const

export function getErrorMessage(statusCode: number): (typeof ErrorMessages)[keyof typeof ErrorMessages] {
  return ErrorMessages[statusCode as keyof typeof ErrorMessages] || ErrorMessages[500]
}
