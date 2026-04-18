const systemSans = [
  'system-ui',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'sans-serif',
]

export const fonts = {
  body: ['Inter', ...systemSans].join(', '),
  heading: ['Montserrat', ...systemSans].join(', '),
}

export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
}
