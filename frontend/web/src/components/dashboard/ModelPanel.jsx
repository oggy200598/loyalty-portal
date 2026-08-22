function ModelPanel() {
  return (
    <article className="panel" id="models">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Model ops</p>
          <h3>Health status</h3>
        </div>
      </div>

      <ul className="health-list">
        <li>
          <span>Prediction latency</span>
          <strong>142 ms</strong>
        </li>
        <li>
          <span>Precision</span>
          <strong>96.8%</strong>
        </li>
        <li>
          <span>Recall</span>
          <strong>91.2%</strong>
        </li>
        <li>
          <span>Training run</span>
          <strong>Queued</strong>
        </li>
      </ul>
    </article>
  )
}

export default ModelPanel
