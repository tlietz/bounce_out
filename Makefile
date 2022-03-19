SCREEN_W=800
SCREEN_H=600

server:
	mix phx.server

mac: docs
	$(call chrome_mac)
	$(call chrome_mac)
	make server

docs:
	$(call open_phoenix_docs)

temp:
	$(call chrome_mac)

define chrome_mac
	/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
	--app="http://localhost:4000" \
	--new-window
endef

define open_phoenix_docs
	mix hex.docs fetch phoenix
	mix hex.docs offline phoenix
endef