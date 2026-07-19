import { NavLink } from 'react-router-dom';
import { BellIcon, SearchIcon } from './icons';

export function Topbar() {
  return (
    <header className="topbar">
      <div className="search">
        <SearchIcon />
        <input type="search" placeholder="Search employees, departments…" aria-label="Search" />
      </div>
      <div className="tb-right">
        <button className="icon-btn" type="button" aria-label="Notifications">
          <span className="dot" />
          <BellIcon />
        </button>
        <NavLink to="/settings" className="icon-btn" aria-label="Account">
          <div className="avatar">A</div>
        </NavLink>
      </div>
    </header>
  );
}
