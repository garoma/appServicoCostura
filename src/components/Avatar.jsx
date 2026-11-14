// Foto da pessoa; sem foto, mostra a inicial do nome
export default function Avatar({ user, size = 48 }) {
  const style = { width: size, height: size, fontSize: size * 0.4 };
  return user.photo
    ? <img className="avatar-img" src={user.photo} alt={user.name} style={style} />
    : <div className="avatar" style={style}>{user.name[0]}</div>;
}
