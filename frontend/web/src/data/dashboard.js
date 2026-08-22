export const metrics = [
  { label: 'Transactions scored', value: '18,492', delta: '+12.4%' },
  { label: 'High-risk flagged', value: '324', delta: '-8.1%' },
  { label: 'Auto-approved', value: '91.6%', delta: '+2.3%' },
  { label: 'Review SLA', value: '14 min', delta: '-3 min' },
]

export const queues = [
  {
    title: 'Manual review',
    count: '28 items',
    detail: 'High-value orders from new buyers or unusual device patterns.',
    tag: 'Priority',
  },
  {
    title: 'Fraud signals',
    count: '11 alerts',
    detail: 'Velocity spikes, mismatched geolocation, and repeated failed payments.',
    tag: 'Alert',
  },
  {
    title: 'Model drift',
    count: 'Stable',
    detail: 'Prediction confidence remains within the expected weekly band.',
    tag: 'Healthy',
  },
]

export const timeline = [
  {
    time: '09:18',
    title: 'Checkout risk review',
    detail: 'Order #TX-10492 escalated because of new device and shipping mismatch.',
  },
  {
    time: '09:26',
    title: 'Seller action logged',
    detail: 'Reviewer added a prepayment requirement and resumed the order flow.',
  },
  {
    time: '09:41',
    title: 'Model retrain queued',
    detail: 'Weekly training run scheduled with the latest outcomes and feedback labels.',
  },
]

export const navSections = [
  'Overview',
  'Transactions',
  'Risk rules',
  'Reviews',
  'Models',
  'Users',
  'Settings',
]
