// Mostra estrelas (somente leitura) ou permite escolher a nota (quando recebe onChange)
export default function StarRating({ value = 0, onChange, showNumber = false }) {
  return (
    <span className="stars" title={`${Number(value).toFixed(1)} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const cls = n <= Math.round(value) ? 'star on' : 'star';
        return onChange ? (
          <button type="button" key={n} className={cls} onClick={() => onChange(n)} aria-label={`${n} estrelas`}>★</button>
        ) : (
          <span key={n} className={cls}>★</span>
        );
      })}
      {showNumber && <b className="stars-num">{value ? Number(value).toFixed(1) : 'Sem notas'}</b>}
    </span>
  );
}
