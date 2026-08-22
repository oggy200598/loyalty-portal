function Section({ eyebrow, title, description, children, className = '' }) {
  return (
    <section className={`section ${className}`.trim()}>
      <div className="section-heading">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {description ? <p className="section-description">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default Section;
