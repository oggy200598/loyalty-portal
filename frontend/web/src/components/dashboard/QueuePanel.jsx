function QueuePanel({ queues }) {
  return (
    <article className="panel panel-large" id="transactions">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Live queue</p>
          <h3>Review pipeline</h3>
        </div>
        <span className="status-pill">Updated just now</span>
      </div>

      <div className="queue-list">
        {queues.map((queue) => (
          <div className="queue-item" key={queue.title}>
            <div>
              <div className="queue-topline">
                <strong>{queue.title}</strong>
                <span>{queue.count}</span>
              </div>
              <p>{queue.detail}</p>
            </div>
            <span className="queue-tag">{queue.tag}</span>
          </div>
        ))}
      </div>
    </article>
  )
}

export default QueuePanel
