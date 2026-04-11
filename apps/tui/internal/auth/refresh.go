package auth

import "time"

var refreshLoopInterval = 50 * time.Minute

func StartRefreshLoop(cfg Config, session Session, onRefresh func(Session), onExpire func()) {
	go func() {
		ticker := time.NewTicker(refreshLoopInterval)
		defer ticker.Stop()

		current := session
		for range ticker.C {
			stored, err := LoadSession()
			if err != nil {
				if onExpire != nil {
					onExpire()
				}
				return
			}
			if stored.AccessToken == "" {
				return
			}
			current = stored

			refreshed, err := Refresh(cfg, current)
			if err != nil {
				_ = DeleteSession()
				if onExpire != nil {
					onExpire()
				}
				return
			}
			current = refreshed
			if onRefresh != nil {
				onRefresh(refreshed)
			}
		}
	}()
}
