server:
	mix phx.server

mac: 
	$(call chrome_mac)
	$(call chrome_mac)
	make server

clean:

define chrome_mac
	open -n -a "Google Chrome" --args "--new-window" "http://localhost:4000"
endef