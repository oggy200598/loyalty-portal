function MetricGrid({ metrics }) {
  return (
    <section className="metric-grid" id="overview">
      {metrics.map((metric) => (
        <article className="metric-card" key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <em>{metric.delta}</em>
        </article>
      ))}
    </section>
  )
}

export default MetricGrid
