package api

import (
	"net/http"
	"net/url"
)

// Workspace is a kern workspace record.
type Workspace struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Slug      string `json:"slug"`
	OwnerID   string `json:"owner_id"`
	CreatedAt string `json:"created_at"`
}

// ListWorkspaces returns all workspaces accessible to the authenticated user.
func (c *Client) ListWorkspaces() ([]Workspace, error) {
	q := url.Values{}
	q.Set("select", "*")
	q.Set("order", "created_at.asc")
	var out []Workspace
	err := c.doJSON(http.MethodGet, "/rest/v1/workspaces", q, nil, &out)
	return out, err
}
