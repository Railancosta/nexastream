FROM ipfs/kubo:latest
ENV IPFS_PROFILE=server
EXPOSE 4001 5001 8080
ENTRYPOINT ["ipfs"]
CMD ["daemon", "--enable-gateway", "--enable-p2p-circuit"]
