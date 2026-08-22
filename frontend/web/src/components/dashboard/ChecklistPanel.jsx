function ChecklistPanel() {
  return (
    <article className="panel" id="settings">
      <div className="panel-header">
        <div>
          <p className="eyebrow">System notes</p>
          <h3>Deployment checklist</h3>
        </div>
      </div>

      <div className="checklist">
        <label>
          <input type="checkbox" checked readOnly />
          API environment variables loaded
        </label>
        <label>
          <input type="checkbox" checked readOnly />
          PostgreSQL reachable on localhost:5432
        </label>
        <label>
          <input type="checkbox" checked readOnly />
          Risk rules published to review queue
        </label>
      </div>
    </article>
  )
}

export default ChecklistPanel
