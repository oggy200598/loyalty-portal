function Hero({ risk }) {
  const score = risk?.riskScore ?? '--';
  const level = risk?.riskLevel ?? 'Chưa có dữ liệu';

  const quickActions = [
    {
      icon: 'bi-bag',
      title: 'Sản phẩm',
      href: '#products',
    },
    {
      icon: 'bi-shop',
      title: 'Cửa hàng',
      href: '#shops',
    },
    {
      icon: 'bi-robot',
      title: 'AI Risk',
      href: '#risk',
    },
    {
      icon: 'bi-exclamation-triangle',
      title: 'Cảnh báo',
      href: '#alerts',
    },
    {
      icon: 'bi-ticket-perforated',
      title: 'Khuyến mãi',
      href: '#offers',
    },
    {
      icon: 'bi-box-seam',
      title: 'Đơn hàng',
      href: '#orders',
    },
    {
      icon: 'bi-heart',
      title: 'Yêu thích',
      href: '#wishlist',
    },
    {
      icon: 'bi-bell',
      title: 'Thông báo',
      href: '#notifications',
    },
    {
      icon: 'bi-person',
      title: 'Tài khoản',
      href: '#account',
    },
  ];

  return (
    <>
<style>{`
  .rm-hero {
    width: min(1280px, calc(100% - 24px));
    margin: 16px auto 0;
  }

  .rm-banner-slide {
    min-height: 320px;
    border-radius: 8px;
    overflow: hidden;

    display: flex;
    align-items: center;
    justify-content: space-between;

    padding: 42px 70px;
    color: #fff;
  }

  .rm-banner-ai {
    background:
      radial-gradient(
        circle at 82% 25%,
        rgba(255,255,255,.16),
        transparent 24%
      ),
      linear-gradient(
        110deg,
        #ee4d2d 0%,
        #f4512f 48%,
        #ff7043 100%
      );
  }

  .rm-banner-shopping {
    background:
      radial-gradient(
        circle at 82% 25%,
        rgba(255,255,255,.15),
        transparent 24%
      ),
      linear-gradient(
        110deg,
        #f97316 0%,
        #fb923c 52%,
        #fdba74 100%
      );
  }

  .rm-banner-seller {
    background:
      radial-gradient(
        circle at 82% 25%,
        rgba(255,255,255,.15),
        transparent 24%
      ),
      linear-gradient(
        110deg,
        #dc2626 0%,
        #ef4444 52%,
        #fb7185 100%
      );
  }

  .rm-banner-content {
    max-width: 650px;
  }

  .rm-banner-eyebrow {
    display: inline-block;
    margin-bottom: 12px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: .16em;
  }

  .rm-banner-content h1,
  .rm-banner-content h2 {
    margin: 0 0 14px;
    font-size: clamp(2rem, 4vw, 3.5rem);
    line-height: 1.08;
    font-weight: 800;
    letter-spacing: -1px;
  }

  .rm-banner-content p {
    max-width: 560px;
    margin-bottom: 24px;
    color: rgba(255,255,255,.9);
    font-size: 15px;
    line-height: 1.7;
  }

  .rm-banner-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .rm-banner-actions .btn {
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
  }

  .rm-banner-risk {
    width: 230px;
    min-width: 230px;
    padding: 24px;
    border-radius: 20px;
    background: rgba(255,255,255,.14);
    border: 1px solid rgba(255,255,255,.28);
    backdrop-filter: blur(14px);
    text-align: center;
  }

  .rm-banner-risk > span {
    display: block;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .14em;
    color: rgba(255,255,255,.8);
  }

  .rm-banner-risk strong {
    display: block;
    margin: 12px 0 5px;
    font-size: 50px;
    line-height: 1;
  }

  .rm-risk-level {
    display: inline-flex;
    padding: 6px 13px;
    border-radius: 999px;
    background: #fff;
    color: #dc2626;
    font-size: 12px;
    font-weight: 800;
  }

  .rm-banner-risk small {
    display: block;
    margin-top: 12px;
    color: rgba(255,255,255,.75);
  }

  .rm-quick-actions {
    margin-top: 12px;
    padding: 18px 10px;
    background: #fff;
    border: 1px solid #f1f5f9;
    border-radius: 8px;
    box-shadow: 0 4px 18px rgba(15,23,42,.06);
  }

  .rm-quick-grid {
    display: grid;
    grid-template-columns: repeat(9, 1fr);
    gap: 8px;
  }

  .rm-quick-action {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 8px 4px;
    color: #374151;
    text-decoration: none;
    transition: all .2s ease;
  }

  .rm-quick-action:hover {
    color: #ee4d2d;
    transform: translateY(-3px);
  }

  .rm-quick-icon {
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #fff3ef;
    color: #ee4d2d;
    font-size: 22px;
  }

  .rm-quick-action span {
    font-size: 13px;
    text-align: center;
    line-height: 1.25;
  }

  /* Bootstrap carousel controls */
  .rm-hero .carousel-control-prev,
  .rm-hero .carousel-control-next {
    width: 48px;
    opacity: 1;
  }

  .rm-hero .carousel-control-prev {
    left: 8px;
  }

  .rm-hero .carousel-control-next {
    right: 8px;
  }

  .rm-hero .carousel-control-prev-icon,
  .rm-hero .carousel-control-next-icon {
    width: 22px;
    height: 22px;
  }

  @media (max-width: 992px) {
    .rm-banner-slide {
      padding: 36px 48px;
    }

    .rm-quick-grid {
      grid-template-columns: repeat(5, 1fr);
    }
  }

  @media (max-width: 700px) {
    .rm-banner-slide {
      min-height: 340px;
      padding: 32px 28px;
    }

    .rm-banner-risk {
      display: none;
    }

    .rm-banner-content h1,
    .rm-banner-content h2 {
      font-size: 2rem;
    }

    .rm-quick-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 480px) {
    .rm-banner-slide {
      min-height: 360px;
      padding: 28px 22px;
    }

    .rm-banner-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .rm-banner-actions .btn {
      width: 100%;
    }
  }
`}</style>

      <section className="rm-hero" id="home">
        {/* =========================
            BANNER
        ========================= */}

        <div
          id="riskMindBanner"
          className="carousel slide"
          data-bs-ride="carousel"
          data-bs-interval="5000"
        >
          <div className="carousel-indicators">
            <button
              type="button"
              data-bs-target="#riskMindBanner"
              data-bs-slide-to="0"
              className="active"
              aria-current="true"
              aria-label="Banner 1"
            />

            <button
              type="button"
              data-bs-target="#riskMindBanner"
              data-bs-slide-to="1"
              aria-label="Banner 2"
            />

            <button
              type="button"
              data-bs-target="#riskMindBanner"
              data-bs-slide-to="2"
              aria-label="Banner 3"
            />
          </div>

          <div className="carousel-inner">
            <div className="carousel-item active">
              <div className="rm-banner-slide rm-banner-ai">
                <div className="rm-banner-content">
                  <span className="rm-banner-eyebrow">
                    AI DECISION SUPPORT
                  </span>

                  <h1>
                    Thương mại điện tử
                    <br />
                    thông minh với AI
                  </h1>

                  <p>
                    Phân tích hành vi người mua, chấm điểm rủi ro
                    và hỗ trợ người bán đưa ra quyết định hiệu quả hơn.
                  </p>

                  <div className="rm-banner-actions">
                    <a href="#products" className="btn btn-light">
                      Khám phá sản phẩm
                    </a>

                    <a href="#risk" className="btn btn-outline-light">
                      Tìm hiểu AI
                    </a>
                  </div>
                </div>

                <div className="rm-banner-risk">
                  <span>AI RISK ANALYSIS</span>

                  <strong>{score}</strong>

                  <div className="rm-risk-level">
                    {level}
                  </div>

                  <small>
                    Điểm rủi ro người mua
                  </small>
                </div>
              </div>
            </div>

            <div className="carousel-item">
              <div className="rm-banner-slide rm-banner-shopping">
                <div className="rm-banner-content">
                  <span className="rm-banner-eyebrow">
                    SMART SHOPPING
                  </span>

                  <h2>
                    Khám phá sản phẩm
                    <br />
                    phù hợp với bạn
                  </h2>

                  <p>
                    Tìm kiếm sản phẩm, mua sắm và quản lý đơn hàng
                    trên nền tảng thương mại điện tử hiện đại.
                  </p>

                  <a href="#products" className="btn btn-light">
                    Mua sắm ngay
                  </a>
                </div>
              </div>
            </div>

            <div className="carousel-item">
              <div className="rm-banner-slide rm-banner-seller">
                <div className="rm-banner-content">
                  <span className="rm-banner-eyebrow">
                    FOR SELLERS
                  </span>

                  <h2>
                    Bán hàng thông minh
                    <br />
                    cùng RiskMind AI
                  </h2>

                  <p>
                    Theo dõi đơn hàng, phân tích người mua
                    và nhận cảnh báo rủi ro trước khi xử lý đơn.
                  </p>

                  <a href="#seller" className="btn btn-light">
                    Dành cho người bán
                  </a>
                </div>
              </div>
            </div>
          </div>

          <button
            className="carousel-control-prev"
            type="button"
            data-bs-target="#riskMindBanner"
            data-bs-slide="prev"
          >
            <span className="carousel-control-prev-icon" />
          </button>

          <button
            className="carousel-control-next"
            type="button"
            data-bs-target="#riskMindBanner"
            data-bs-slide="next"
          >
            <span className="carousel-control-next-icon" />
          </button>
        </div>

        {/* =========================
            QUICK ACTIONS
        ========================= */}

        <div className="rm-quick-actions">
          <div className="rm-quick-grid">
            {quickActions.map((item) => (
              <a
                key={item.title}
                href={item.href}
                className="rm-quick-action"
              >
                <div className="rm-quick-icon">
                  <i className={`bi ${item.icon}`} />
                </div>

                <span>{item.title}</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export default Hero;