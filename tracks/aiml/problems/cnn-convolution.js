/* Convolutions & Pooling — Neural Networks (Medium). Integer-friendly
 * Conv2D (cross-correlation, zero pad, stride), ReLU2D, MaxPool, and the
 * parameter-count arithmetic that is the whole point of convolution: 80
 * weights vs 4.2 million for the same 28x28 input. Pins the worked
 * vertical-edge example, the padding border artifact, pooling's translation
 * tolerance, and the identity-kernel property — all via go run.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// A 3x3 kernel window sliding over the padded image, producing one
	// output cell per position. Ids suffixed AICNN — SVGs share the page
	// id namespace across tracks.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="a 3 by 3 kernel window slides across the input image; each placement produces one output cell; the same nine weights are reused at every position">' +
		'<text x="20" y="20" class="lbl">one kernel, every position: the same 9 weights slide across the whole image</text>' +
		// input grid 5x5 (cells 24px)
		'<g fill="none" stroke="var(--accent)" stroke-width="1" opacity="0.6">' +
		'<path d="M 40 40 h 120 M 40 64 h 120 M 40 88 h 120 M 40 112 h 120 M 40 136 h 120 M 40 160 h 120"/>' +
		'<path d="M 40 40 v 120 M 64 40 v 120 M 88 40 v 120 M 112 40 v 120 M 136 40 v 120 M 160 40 v 120"/>' +
		'</g>' +
		'<text x="100" y="180" text-anchor="middle" class="lbl">input 5&#215;5</text>' +
		// kernel window highlighted on input
		'<rect x="64" y="64" width="72" height="72" fill="none" stroke="var(--warn)" stroke-width="2.5"/>' +
		'<text x="100" y="58" text-anchor="middle" class="lbl" style="fill:var(--warn)">3&#215;3 window</text>' +
		// arrow to output
		'<path d="M 170 100 L 300 100" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAICNN)"/>' +
		'<text x="235" y="92" text-anchor="middle" class="lbl">multiply + sum</text>' +
		// output grid 3x3
		'<g fill="none" stroke="var(--accent)" stroke-width="1" opacity="0.6">' +
		'<path d="M 320 64 h 72 M 320 88 h 72 M 320 112 h 72 M 320 136 h 72"/>' +
		'<path d="M 320 64 v 72 M 344 64 v 72 M 368 64 v 72 M 392 64 v 72"/>' +
		'</g>' +
		'<rect x="344" y="88" width="24" height="24" fill="none" stroke="var(--warn)" stroke-width="2.5"/>' +
		'<text x="356" y="180" text-anchor="middle" class="lbl">output 3&#215;3 — one cell per placement</text>' +
		'<text x="440" y="70" class="lbl">(n + 2p − f)/s + 1</text>' +
		'<text x="440" y="88" class="lbl">= (5+0−3)/1+1 = 3</text>' +
		'<defs><marker id="dgArrowAICNN" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'cnn-convolution',
		title: 'Convolutions & Pooling',
		nav: 'convolutions',
		difficulty: 'Medium',
		category: 'Neural Networks',
		task: 'Implement Conv2D (zero padding, stride), ReLU2D, MaxPool, and the parameter-count arithmetic that justifies convolution over dense layers.',

		prose: [
			'<h2>Convolutions &amp; Pooling</h2>' +
			'<p>Take the smallest interesting image — MNIST&rsquo;s 28&#215;28 ' +
			'digits — and try the obvious architecture: flatten to 784 pixels, ' +
			'feed a dense layer. To produce even one modest 8-channel feature map ' +
			'you are staring at <em>4.2 million</em> weights, and worse: shift the ' +
			'digit one pixel right and every one of those weights sees different ' +
			'input — the net must relearn "3" at every position. Convolution is ' +
			'the fix for both problems at once, and it is one idea: <strong>slide ' +
			'a tiny reusable window of weights across the image</strong>.</p>' +
			'<ul>' +
			'<li><strong>Conv2D</strong>: place an <code>f&#215;f</code> kernel at ' +
			'each position of the (zero-padded) image, multiply elementwise, sum. ' +
			'Output size per axis: <code>(n + 2p − f)/s + 1</code> (integer floor) ' +
			'for padding <code>p</code> and stride <code>s</code>. One honest ' +
			'disclosure: deep-learning "convolution" does <em>not</em> flip the ' +
			'kernel — it is cross-correlation, and this item follows that ' +
			'convention like every framework does.</li>' +
			'<li><strong>ReLU2D</strong>: <code>max(0, v)</code> per cell. A ' +
			'kernel is a polarity-sensitive detector; ReLU keeps only the polarity ' +
			'you asked for (the harness demonstrates with a mirrored kernel whose ' +
			'responses are all negative).</li>' +
			'<li><strong>MaxPool</strong>: the strongest response in each ' +
			'<code>size&#215;size</code> window, stepped by <code>stride</code>. ' +
			'Pooling buys <em>translation tolerance</em>: a feature can shift ' +
			'within a window and the pooled map does not change at all.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>The worked example the harness pins: a 5&#215;5 image whose left ' +
			'two columns are 0 and right three are 9 — a vertical edge between ' +
			'columns 1 and 2 — convolved with the vertical-edge kernel ' +
			'(each row <code>[-1, 0, 1]</code>, i.e. right column minus left ' +
			'column):</p>',
			{ lang: 'txt', code: 'image (5x5)          kernel        output (3x3)\n0 0 9 9 9            -1 0 1        27 27  0\n0 0 9 9 9            -1 0 1        27 27  0\n0 0 9 9 9            -1 0 1        27 27  0\n0 0 9 9 9\n0 0 9 9 9            27 where the window straddles the edge, 0 on the\n                     uniform region: the kernel is an edge DETECTOR' },
			'<p>Note what zero padding does to the same image: the pad invents a ' +
			'black border, so with <code>pad=1</code> the columns touching the ' +
			'right border see a phantom 9&#8594;0 edge and light up <em>negative</em> ' +
			'— a real artifact (borders are where conv features are least ' +
			'trustworthy), and the harness pins it.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Conv2D</code>, <code>ReLU2D</code>, ' +
			'<code>MaxPool</code>, <code>ConvParams</code>, and ' +
			'<code>DenseParams</code> per the doc comments. Single channel in, ' +
			'single channel out — real layers stack <code>inCh</code> input ' +
			'channels and <code>outCh</code> kernels (that is exactly what the ' +
			'<code>ConvParams</code> formula counts); the sliding-window core you ' +
			'write here is unchanged, just summed over channels.</p>' +
			'<div class="tip">The parameter case is the punchline of the whole ' +
			'item: 8 kernels of 3&#215;3 on a 28&#215;28 image cost 80 weights; a ' +
			'dense layer producing the same number of outputs costs 4,245,280. ' +
			'Weight sharing is a 53,000&#215; compression — and it is also a prior: ' +
			'"the statistics of images are the same everywhere". When that prior ' +
			'is wrong (say, the top of a portrait photo differs from the bottom), ' +
			'convolution fights you.</div>',
		],

		starter: [
			'package main',
			'',
			'// Conv2D cross-correlates img with a square f x f kernel (NO kernel',
			'// flip — the deep-learning convention) after zero-padding img by pad',
			'// cells on all four sides, stepping the window by stride:',
			'//',
			'//   out[r][c] = sum over i,j of kernel[i][j] * padded[r*stride+i][c*stride+j]',
			'//',
			'// Output dims (integer floor division): (n + 2*pad - f)/stride + 1',
			'// per axis, computed independently for rows and columns (img may be',
			'// rectangular). Assume stride >= 1 and the kernel fits the padded',
			'// image.',
			'func Conv2D(img, kernel [][]float64, stride, pad int) [][]float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// ReLU2D returns a FRESH matrix with max(0, v) applied per cell.',
			'// img must not be mutated.',
			'func ReLU2D(img [][]float64) [][]float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// MaxPool returns the max of each size x size window, stepping by',
			'// stride, with NO padding: output dims are (n - size)/stride + 1',
			'// (integer floor) per axis.',
			'func MaxPool(img [][]float64, size, stride int) [][]float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// ConvParams counts the weights of a conv layer with outCh kernels of',
			'// size f x f over inCh input channels, plus one bias per output',
			'// channel:',
			'//',
			'//   outCh * (inCh*f*f + 1)',
			'func ConvParams(inCh, outCh, f int) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// DenseParams counts a fully connected layer: one weight per',
			'// (input, output) pair plus one bias per output:',
			'//',
			'//   outDim * (inDim + 1)',
			'func DenseParams(inDim, outDim int) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// A vertical edge between columns 1 and 2: left of it 0, right 9.',
			'	edge := [][]float64{',
			'		{0, 0, 9, 9, 9},',
			'		{0, 0, 9, 9, 9},',
			'		{0, 0, 9, 9, 9},',
			'		{0, 0, 9, 9, 9},',
			'		{0, 0, 9, 9, 9},',
			'	}',
			'	// Right-minus-left detector, and its mirror (left-minus-right).',
			'	vEdge := [][]float64{{-1, 0, 1}, {-1, 0, 1}, {-1, 0, 1}}',
			'	mirror := [][]float64{{1, 0, -1}, {1, 0, -1}, {1, 0, -1}}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"Vertical-edge kernel on the worked 5x5: the edge lights up 27 where the window straddles it",',
			'			"[[27 27 0] [27 27 0] [27 27 0]]",',
			'			func() string { return fmt.Sprint(Conv2D(edge, vEdge, 1, 0)) }},',
			'		{"Mirrored kernel responds negative; ReLU keeps only the polarity you asked for",',
			'			"raw=[[-27 -27 0] [-27 -27 0] [-27 -27 0]] relu=[[0 0 0] [0 0 0] [0 0 0]]",',
			'			func() string {',
			'				raw := Conv2D(edge, mirror, 1, 0)',
			'				return "raw=" + fmt.Sprint(raw) + " relu=" + fmt.Sprint(ReLU2D(raw))',
			'			}},',
			'		{"stride=2 pad=1: zero padding invents a black border, so the right edge fires NEGATIVE",',
			'			"[[0 18 -18] [0 27 -27] [0 18 -18]]",',
			'			func() string { return fmt.Sprint(Conv2D(edge, vEdge, 2, 1)) }},',
			'		{"The shape formula (n+2p-f)/s+1, floor division, for three (stride, pad) settings",',
			'			"s1p0=3x3 s2p1=3x3 s1p1=5x5",',
			'			func() string {',
			'				a := Conv2D(edge, vEdge, 1, 0)',
			'				b := Conv2D(edge, vEdge, 2, 1)',
			'				c := Conv2D(edge, vEdge, 1, 1)',
			'				return fmt.Sprintf("s1p0=%dx%d s2p1=%dx%d s1p1=%dx%d", len(a), len(a[0]), len(b), len(b[0]), len(c), len(c[0]))',
			'			}},',
			'		{"Property: the identity kernel (center 1) with pad=1 reproduces the image exactly",',
			'			"[[1 2 3] [4 5 6] [7 8 9]]",',
			'			func() string {',
			'				ident := [][]float64{{0, 0, 0}, {0, 1, 0}, {0, 0, 0}}',
			'				small := [][]float64{{1, 2, 3}, {4, 5, 6}, {7, 8, 9}}',
			'				return fmt.Sprint(Conv2D(small, ident, 1, 1))',
			'			}},',
			'		{"MaxPool 2x2 stride 2: the strongest response per window survives",',
			'			"[[6 8] [3 4]]",',
			'			func() string {',
			'				img := [][]float64{{1, 3, 2, 4}, {5, 6, 7, 8}, {3, 2, 1, 0}, {1, 2, 3, 4}}',
			'				return fmt.Sprint(MaxPool(img, 2, 2))',
			'			}},',
			'		{"Translation tolerance: shift the feature within its pooling window — identical pooled map",',
			'			"A=[[9 0] [0 0]] B=[[9 0] [0 0]] same=true",',
			'			func() string {',
			'				imgA := [][]float64{{9, 0, 0, 0}, {0, 0, 0, 0}, {0, 0, 0, 0}, {0, 0, 0, 0}}',
			'				imgB := [][]float64{{0, 0, 0, 0}, {0, 9, 0, 0}, {0, 0, 0, 0}, {0, 0, 0, 0}}',
			'				pa := fmt.Sprint(MaxPool(imgA, 2, 2))',
			'				pb := fmt.Sprint(MaxPool(imgB, 2, 2))',
			'				return fmt.Sprintf("A=%s B=%s same=%v", pa, pb, pa == pb)',
			'			}},',
			'		{"THE point: 8 conv kernels vs a dense layer producing the same 8x26x26 outputs on 28x28",',
			'			"conv=80 dense=4245280 ratio=53066",',
			'			func() string {',
			'				conv := ConvParams(1, 8, 3)',
			'				dense := DenseParams(784, 8*26*26)',
			'				return fmt.Sprintf("conv=%d dense=%d ratio=%d", conv, dense, dense/conv)',
			'			}},',
			'		{"A real first layer: 64 kernels of 3x3 over RGB (VGG conv1) is still tiny",',
			'			"1792",',
			'			func() string { return fmt.Sprintf("%d", ConvParams(3, 64, 3)) }},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			got := c.got()',
			'			r["pass"] = got == c.want',
			'			r["got"] = got',
			'		})',
			'		results = append(results, r)',
			'	}',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'// Conv2D: the sliding window, materialized. Padding is built as an',
			'// explicit bordered copy — clearer than clamping indices inside the',
			'// hot loop, and it makes the "padding invents a black border" case',
			'// visible in the code itself: those zeros are real values the kernel',
			'// reads.',
			'func Conv2D(img, kernel [][]float64, stride, pad int) [][]float64 {',
			'	rows := len(img)',
			'	cols := len(img[0])',
			'	f := len(kernel)',
			'	padRows := rows + 2*pad',
			'	padCols := cols + 2*pad',
			'	padded := make([][]float64, padRows)',
			'	for r := range padded {',
			'		padded[r] = make([]float64, padCols) // zero-valued border by default',
			'	}',
			'	for r := 0; r < rows; r++ {',
			'		for c := 0; c < cols; c++ {',
			'			padded[r+pad][c+pad] = img[r][c]',
			'		}',
			'	}',
			'	// Integer floor division implements the shape formula directly:',
			'	// positions that would hang off the edge simply do not exist.',
			'	outRows := (padRows-f)/stride + 1',
			'	outCols := (padCols-f)/stride + 1',
			'	out := make([][]float64, outRows)',
			'	for r := 0; r < outRows; r++ {',
			'		out[r] = make([]float64, outCols)',
			'		for c := 0; c < outCols; c++ {',
			'			// Cross-correlation: kernel[i][j] meets the pixel at the',
			'			// SAME offset — no flip. (True convolution would index',
			'			// kernel[f-1-i][f-1-j]; frameworks dropped the flip because',
			'			// learned kernels make it meaningless.)',
			'			sum := 0.0',
			'			for i := 0; i < f; i++ {',
			'				for j := 0; j < f; j++ {',
			'					sum += kernel[i][j] * padded[r*stride+i][c*stride+j]',
			'				}',
			'			}',
			'			out[r][c] = sum',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
			'// ReLU2D: fresh matrix, zero-initialized, copy only the positives.',
			'// The zero default IS the max(0, v) for the non-positive cells.',
			'func ReLU2D(img [][]float64) [][]float64 {',
			'	out := make([][]float64, len(img))',
			'	for r := range img {',
			'		out[r] = make([]float64, len(img[r]))',
			'		for c := range img[r] {',
			'			if img[r][c] > 0 {',
			'				out[r][c] = img[r][c]',
			'			}',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
			'// MaxPool: same window walk as Conv2D but the reduction is max, not',
			'// dot product — and there are no weights at all, which is why pooling',
			'// layers never appear in parameter counts. Seeding max with the',
			'// window\'s first cell (not 0) keeps all-negative windows correct.',
			'func MaxPool(img [][]float64, size, stride int) [][]float64 {',
			'	outRows := (len(img)-size)/stride + 1',
			'	outCols := (len(img[0])-size)/stride + 1',
			'	out := make([][]float64, outRows)',
			'	for r := 0; r < outRows; r++ {',
			'		out[r] = make([]float64, outCols)',
			'		for c := 0; c < outCols; c++ {',
			'			max := img[r*stride][c*stride]',
			'			for i := 0; i < size; i++ {',
			'				for j := 0; j < size; j++ {',
			'					if v := img[r*stride+i][c*stride+j]; v > max {',
			'						max = v',
			'					}',
			'				}',
			'			}',
			'			out[r][c] = max',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
			'// ConvParams: the count is independent of image size — that is the',
			'// entire economic argument for convolution. Each of the outCh kernels',
			'// owns inCh*f*f weights plus one bias.',
			'func ConvParams(inCh, outCh, f int) int {',
			'	return outCh * (inCh*f*f + 1)',
			'}',
			'',
			'// DenseParams scales with BOTH the input and output sizes — pixels',
			'// times outputs. On images that product explodes, and every weight is',
			'// position-specific: no sharing, no translation robustness.',
			'func DenseParams(inDim, outDim int) int {',
			'	return outDim * (inDim + 1)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Channels and filter banks — the part this item flattened</h3>' +
			'<p>A real conv layer maps <code>inCh</code> channels to ' +
			'<code>outCh</code>: each output channel has its own ' +
			'<code>inCh&#215;f&#215;f</code> kernel stack, correlated against every ' +
			'input channel and summed — your <code>ConvParams</code> formula counts ' +
			'exactly this. So layer 1 turns RGB into 64 feature maps ("is there a ' +
			'red-green edge here?"), layer 2 correlates <em>those</em> 64 maps ' +
			'into corners and textures, and so on. Two things grow with depth: the ' +
			'channel count (features get more abstract) and the <strong>receptive ' +
			'field</strong> — stack two 3&#215;3 convs and each output cell sees ' +
			'5&#215;5 of the input; add pooling/stride and it doubles. That is the ' +
			'feature hierarchy (edges &#8594; textures &#8594; parts &#8594; ' +
			'objects) that made CNNs interpretable enough to visualize, and it is ' +
			'why VGG-style "3&#215;3 all the way down" beat big-kernel designs: two ' +
			'3&#215;3 layers see as far as one 5&#215;5 but with fewer weights and ' +
			'an extra nonlinearity.</p>' +
			'<h3>Pooling, stride, and where the tolerance goes</h3>' +
			'<p>Your translation case shows max-pooling absorbing a one-pixel ' +
			'shift — multiply that through a deep stack and the network tolerates ' +
			'real-world jitter, which dense layers must learn position by ' +
			'position. The cost is aliasing: information about <em>where exactly</em> ' +
			'the feature was is discarded, which is why segmentation and detection ' +
			'architectures (U-Net, FPN) keep high-resolution skip connections ' +
			'around the pooled path. Modern classifiers often drop explicit ' +
			'pooling for stride-2 convolutions (learned downsampling), and global ' +
			'average pooling replaced the giant dense head — AlexNet spent 90% of ' +
			'its 60M parameters on the final dense layers; ResNet&rsquo;s answer ' +
			'was to pool each channel to one number first.</p>' +
			'<h3>Where CNNs stand post-ViT</h3>' +
			'<p>Vision Transformers removed the sliding window entirely — an ' +
			'image becomes 16&#215;16 patches attended like tokens — and at ' +
			'internet scale they win benchmarks. But note what ViT had to do: ' +
			'its patch embedding <em>is</em> a stride-16 convolution, and ViTs ' +
			'need vastly more data precisely because they lack convolution&rsquo;s ' +
			'built-in prior (locality + translation invariance) and must learn it. ' +
			'On small datasets, on edge devices, and in latency-critical pipelines ' +
			'(a <code>MobileNet</code> on a phone camera), CNNs remain the ' +
			'default; ConvNeXt showed a modernized pure CNN matches ViTs at equal ' +
			'compute. The interview-grade summary of this item: convolution = ' +
			'weight sharing = a translation-invariance prior + a 53,000&#215; ' +
			'parameter saving, pooling trades location precision for shift ' +
			'tolerance, and the shape formula <code>(n+2p−f)/s+1</code> is the ' +
			'first thing you sanity-check when a model&rsquo;s tensor shapes ' +
			'refuse to line up.</p>',
		],
		complexity: { time: 'O(outRows · outCols · f²) per conv — every output cell reads the full window', space: 'O(n²) — the padded copy plus the output map' },
	});
})();
