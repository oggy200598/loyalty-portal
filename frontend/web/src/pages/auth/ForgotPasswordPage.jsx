import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Email không hợp lệ');
      return;
    }

    setError(null);

    try {
      setLoading(true);
      await api.forgotPassword({ email });
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể gửi yêu cầu. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        .fp-page {
          min-height: calc(100vh - 146px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 16px;
          background: linear-gradient(135deg, #fdeee9 0%, #fef6f4 50%, #fff 100%);
        }

        .fp-card {
          width: min(420px, 100%);
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 12px 40px rgba(238, 77, 45, .14);
          overflow: hidden;
        }

        .fp-head {
          padding: 32px 32px 8px;
          text-align: center;
        }

        .fp-logo {
          width: 56px;
          height: 56px;
          margin: 0 auto 14px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: #ee4d2d;
          color: #fff;
          font-size: 24px;
          box-shadow: 0 6px 18px rgba(238, 77, 45, .35);
        }

        .fp-head h1 {
          font-size: 22px;
          font-weight: 700;
          color: #222;
          margin-bottom: 4px;
        }

        .fp-head p {
          font-size: 14px;
          color: #888;
          margin: 0;
        }

        .fp-body { padding: 24px 32px 32px; }

        .fp-body label {
          font-size: 13px;
          font-weight: 600;
          color: #444;
          margin-bottom: 6px;
          display: block;
        }

        .fp-input-group { position: relative; }

        .fp-input-group i.leading {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #aaa;
        }

        .fp-input-group input {
          width: 100%;
          height: 46px;
          padding: 0 16px 0 42px;
          border: 1.5px solid #e5e5e5;
          border-radius: 10px;
          font-size: 14px;
          outline: none;
        }

        .fp-input-group input:focus {
          border-color: #ee4d2d;
          box-shadow: 0 0 0 3px rgba(238, 77, 45, .12);
        }

        .fp-error {
          color: #d93025;
          font-size: 12.5px;
          margin-top: 5px;
        }

        .fp-success {
          background: #e8f7ee;
          color: #16a34a;
          font-size: 13.5px;
          padding: 12px 14px;
          border-radius: 10px;
          text-align: center;
        }

        .fp-submit {
          width: 100%;
          height: 48px;
          margin-top: 18px;
          border: 0;
          border-radius: 10px;
          background: #ee4d2d;
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
        }

        .fp-submit:hover:not(:disabled) { background: #d63e20; }
        .fp-submit:disabled { opacity: .65; cursor: not-allowed; }

        .fp-footer {
          text-align: center;
          font-size: 13.5px;
          color: #666;
          margin-top: 22px;
        }

        .fp-footer a {
          color: #ee4d2d;
          font-weight: 600;
          text-decoration: none;
        }
      `}</style>

      <div className="fp-page">
        <div className="fp-card">
          <div className="fp-head">
            <div className="fp-logo">
              <i className="bi bi-key" />
            </div>
            <h1>Quên mật khẩu</h1>
            <p>
              Nhập email để nhận hướng dẫn đặt lại mật khẩu
            </p>
          </div>

          <div className="fp-body">
            {success ? (
              <div className="fp-success">
                <i className="bi bi-check-circle me-1" />
                Đã gửi email hướng dẫn. Vui lòng kiểm tra
                hộp thư của bạn.
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <label htmlFor="email">Email</label>

                <div className="fp-input-group">
                  <i className="bi bi-envelope leading" />

                  <input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                  />
                </div>

                {error && (
                  <div className="fp-error">{error}</div>
                )}

                <button
                  type="submit"
                  className="fp-submit"
                  disabled={loading}
                >
                  {loading
                    ? 'Đang gửi...'
                    : 'Gửi yêu cầu'}
                </button>
              </form>
            )}

            <div className="fp-footer">
              Nhớ lại mật khẩu rồi?{' '}
              <Link to="/login">Đăng nhập</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ForgotPasswordPage;
