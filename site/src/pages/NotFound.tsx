import { href } from '../data';

export function NotFound() {
  return (
    <section className="wrap not-found">
      <h1>페이지를 찾을 수 없습니다</h1>
      <p>주소가 바뀌었거나 없는 페이지입니다.</p>
      <a className="btn btn-primary" href={href()}>
        첫 화면으로
      </a>
    </section>
  );
}
