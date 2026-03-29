import SwiftUI
import SVGPath

// MARK: - Google (matches web `GoogleGlyph`)

struct OAuthGoogleGlyph: View {
    private static let paths: [(Color, String)] = [
        (Color(red: 0.259, green: 0.522, blue: 0.957), "M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.2 17.64 11.9 17.64 9.2z"),
        (Color(red: 0.204, green: 0.659, blue: 0.325), "M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"),
        (Color(red: 0.984, green: 0.737, blue: 0.020), "M3.964 10.712c-.18-.54-.282-1.117-.282-1.712s.102-1.172.282-1.712V4.956H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.044l3.007-2.332z"),
        (Color(red: 0.918, green: 0.259, blue: 0.204), "M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.956L3.964 7.288C4.672 5.164 6.656 3.58 9 3.58z"),
    ]

    var body: some View {
        ZStack {
            ForEach(Array(Self.paths.enumerated()), id: \.offset) { _, item in
                GooglePiece(d: item.1)
                    .fill(item.0)
            }
        }
        .frame(width: 18, height: 18)
    }

    /// All four paths share the web `GoogleGlyph` 18×18 viewBox. Scaling each fragment
    /// with `Path(svgPath:in:)` would fit disparate bounds and misalign colors — use raw paths then one uniform scale.
    private struct GooglePiece: Shape {
        let d: String
        func path(in rect: CGRect) -> Path {
            let raw = (try? Path(svgPath: d, in: nil)) ?? Path()
            let sx = rect.width / 18
            let sy = rect.height / 18
            return raw.applying(CGAffineTransform(scaleX: sx, y: sy))
        }
    }
}

// MARK: - GitHub (official mark path from web `GitHubGlyph`, scaled via SVGPath)

struct OAuthGitHubGlyph: View {
    @Environment(\.kernTheme) private var theme

    private static let githubD =
        "M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"

    var body: some View {
        GitHubMarkShape(d: Self.githubD)
            .fill(theme.text, style: FillStyle(eoFill: true))
            .frame(width: 18, height: 18)
    }

    private struct GitHubMarkShape: Shape {
        let d: String
        func path(in rect: CGRect) -> Path {
            let raw = (try? Path(svgPath: d, in: nil)) ?? Path()
            let sx = rect.width / 98
            let sy = rect.height / 96
            return raw.applying(CGAffineTransform(scaleX: sx, y: sy))
        }
    }
}
