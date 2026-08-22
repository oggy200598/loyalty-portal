function ActivityPanel({ timeline }) {
  return (
    <article className="panel" id="reviews">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Audit trail</p>
          <h3>Recent activity</h3>
        </div>
      </div>

      <div className="timeline">
        {timeline.map((event) => (
          <div className="timeline-item" key={event.time + event.title}>
            <time>{event.time}</time>
            <div>
              <strong>{event.title}</strong>
              <p>{event.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}

export default ActivityPanel
