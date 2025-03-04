type T = any
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE"

class FetchWrapper {
	private requestInterceptors: Array<(url: string, options: RequestInit) => void> = []
	private responseInterceptors: Array<(response: Response) => void> = []
	async get<T>(url: string) {
		return this.request("GET", url)
	}

	async post<T>(url: string, body?: T) {
		return this.request("POST", url, body)
	}

	async put<T>(url: string, body?: T) {
		return this.request("PUT", url, body)
	}

	async delete<T>(url: string, body?: T) {
		return this.request("DELETE", url, body)
	}
	//@param {Method}  method - A string param.
	//@param {string} url - A string param
	//@param {any} body - An optional param,should be string or  
	private async request(method: HttpMethod, url: string, body?: unknown): Promise<T> {
		const options: RequestInit = {
			method: method,
			headers: {
				"Content-Type": "application/json",
			},
		}
		if (body) {
			//check if body is already a string 
			options.body = (typeof body === 'string')
				? body
				: JSON.stringify(body)
		}
		// run request interceptor
		this.runRequestInterceptor(url, options)

		try {
			// clone the initial response
			const response = await fetch(url, options);
			(response as any).config = { method, url, options }
			const responseClone = response.clone();
			// run response interceptor
			const finalRes = await this.runResponseInterceptor(response);
			if (!finalRes.ok) {
				console.log(finalRes)
				return this.handleErrorResponse(finalRes)
			}
			const data: any = await finalRes.json();
			return data
			// const data: any = await response.json()
			// return data
		} catch (error) {

		}

	}

	public addRequestInterceptor(interceptor: (url: string, options: RequestInit) => void) {
		this.requestInterceptors.push(interceptor)
	}

	private runRequestInterceptor(url: string, options: RequestInit) {
		this.requestInterceptors.forEach((interceptor) => {
			return interceptor(url, options)
		})
	}

	public addResponseInterceptor(interceptor: (response: Response) => Promise<Response>) {
		this.responseInterceptors.push(interceptor)

	}

	private async runResponseInterceptor(response: Response): Promise<Response> {
		let processedResponse = response
		for (const interceptor of this.responseInterceptors) {
			const result = await interceptor(processedResponse);

			if (result === null || result === undefined) {
				throw new Error("Interceptor returned an invalid response");
			}
			processedResponse = result;
		}
		return processedResponse

	}
	public getInterceptors() {
		return this.requestInterceptors
	}


	// move the logic of error response to handleErrorResponse, private method
	public async handleErrorResponse(response: Response) {
		const contentType = response.headers.get("Content-Type")
		let errorData
		// check if content type is json or not
		if (contentType && contentType.includes("application/json")) {
			errorData = await response.json();
		}
		else if (contentType && contentType.includes("application/html")) {
			errorData = await { message: await response.text() }
		}
		console.error(`
				Request failed with status code ${response.status}
				: ${response.status}
				`)
		const error = new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
		throw Object.assign(error, {
			status: response.status,
			data: errorData
		});


	}

	public getCookie(name: string) {
		const formatName = `${name}=`
		let cookies = document.cookie.split(";")
		for (let i = 0; i < cookies.length; i++) {
			let cookie = cookies[i].trim()
			if (cookie.startsWith(formatName)) {
				let filteredCookie = cookie.substring(
					formatName.length,
					cookie.length
				)
				return filteredCookie
			}
		}
		return null
	}
	public setCookie(name: string, value: string, minutes: number, path?: string) {
		let maxAge, expires
		path = path ? `;path=${path}` : ";path=/"
		if (minutes) {
			const date = new Date()
			//60 * 1000 = 1min
			date.setTime(date.getTime() + minutes * 60 * 1000)
			expires = `;expires=${date.toUTCString()}`
			maxAge = `;max-age=${minutes * 60}`
		}
		// SameSite=Strict${location.protocol === "https:" ? "; Secure" : ""} ;path=/;SameSite=None; Secure
		document.cookie = `${name}=${value || ""
			}${maxAge}${expires};${path}`
	}
	public parseTokens(at: string, rt: string) {
		// reinitialize the cookies
		this.setCookie("_at", "", 0, "/");
		this.setCookie("_rt", "", 0, "/");
		this.setCookie("_at", at, 1, "/")
		// 10 minutes
		this.setCookie("_rt", rt, 10, "/")
	}


}

const fetchWrapper = new FetchWrapper();


export { FetchWrapper as fetchWrapperClass }
export { fetchWrapper }