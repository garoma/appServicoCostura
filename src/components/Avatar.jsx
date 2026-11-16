
// Foto da pessoa; sem foto, mostra a inicial do nome
export default function Avatar({ user, size = 48 }) {
  const nome = user?.name?.trim() || '?';

  const style = {
    width: size,
    height: size,
    fontSize: size * 0.4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    textAlign: 'center',
    flexShrink: 0
  };

  return user?.photo ? (
    <img
      className="avatar-img"
      src={user.photo}
      alt={nome}
      style={style}
    />
  ) : (
    <div className="avatar" style={style}>
      {nome.charAt(0).toUpperCase()}
    </div>
  );
}
