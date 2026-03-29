package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
)

// Field matches public.fields.
type Field struct {
	ID                 string          `json:"id"`
	Name               string          `json:"name"`
	Slug               string          `json:"slug"`
	Type               string          `json:"type"`
	IsPrimary          bool            `json:"is_primary"`
	IsRequired         bool            `json:"is_required"`
	SortOrder          int             `json:"sort_order"`
	Options            json.RawMessage `json:"options"`
	CollectionID       string          `json:"collection_id"`
	IsHiddenByDefault  bool            `json:"is_hidden_by_default"`
}

// ListFields returns fields for a collection ordered by sort_order.
func (c *Client) ListFields(collectionID string) ([]Field, error) {
	q := url.Values{}
	q.Set("select", "*")
	q.Set("collection_id", "eq."+collectionID)
	q.Set("order", "sort_order.asc")
	var out []Field
	err := c.doJSON(http.MethodGet, "/rest/v1/fields", q, nil, &out)
	return out, err
}

var slugNonAlnum = regexp.MustCompile(`[^a-z0-9]+`)

// Slugify produces a URL-safe slug from a name.
func Slugify(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	s = slugNonAlnum.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "field"
	}
	return s
}

// CreateField adds a field; slug is derived from name and deduped against existing.
func (c *Client) CreateField(userID, collectionID, name, fieldType string, existingSlugs map[string]struct{}) (*Field, error) {
	base := Slugify(name)
	slug := base
	for n := 1; ; n++ {
		if _, taken := existingSlugs[slug]; !taken {
			break
		}
		slug = fmt.Sprintf("%s-%d", base, n)
	}
	var maxSort []struct {
		SortOrder int `json:"sort_order"`
	}
	q := url.Values{}
	q.Set("select", "sort_order")
	q.Set("collection_id", "eq."+collectionID)
	q.Set("order", "sort_order.desc")
	q.Set("limit", "1")
	if err := c.doJSON(http.MethodGet, "/rest/v1/fields", q, nil, &maxSort); err != nil {
		return nil, err
	}
	next := 0
	if len(maxSort) > 0 {
		next = maxSort[0].SortOrder + 1
	}
	var options any
	switch fieldType {
	case "select", "multi_select":
		options = map[string]any{"items": []any{}}
	default:
		options = nil
	}
	body := map[string]any{
		"user_id":               userID,
		"collection_id":         collectionID,
		"name":                  name,
		"slug":                  slug,
		"type":                  fieldType,
		"options":               options,
		"is_required":           false,
		"is_primary":            false,
		"is_hidden_by_default":  false,
		"sort_order":            next,
	}
	var created []Field
	if err := c.doJSON(http.MethodPost, "/rest/v1/fields", url.Values{"select": []string{"*"}}, body, &created); err != nil {
		return nil, err
	}
	if len(created) == 0 {
		return nil, fmt.Errorf("create field: empty response")
	}
	return &created[0], nil
}

// DeleteField removes a field by id.
func (c *Client) DeleteField(id string) error {
	q := url.Values{}
	q.Set("id", "eq."+id)
	return c.doJSON(http.MethodDelete, "/rest/v1/fields", q, nil, nil)
}
